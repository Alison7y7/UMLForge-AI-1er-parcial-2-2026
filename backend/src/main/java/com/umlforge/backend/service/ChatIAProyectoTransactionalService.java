package com.umlforge.backend.service;

import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.dto.SolicitudIAChatRequest;
import com.umlforge.backend.dto.SolicitudIAChatResponse;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.BitacoraRepository;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import com.umlforge.backend.repository.SolicitudIAChatProyectoRepository;
import com.umlforge.backend.service.ia.chat.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class ChatIAProyectoTransactionalService {
    private static final int MAX_ERROR_DETAIL = 4000;
    private final ProjectAccessService accessService;
    private final MensajeChatProyectoRepository mensajeRepository;
    private final SolicitudIAChatProyectoRepository solicitudRepository;
    private final BitacoraRepository bitacoraRepository;
    private final ChatProyectoService chatService;
    private final ChatIAPromptBuilder promptBuilder;
    private final ChatIAResponseParser responseParser;
    private final List<ChatIAProvider> providers;
    private final ObjectMapper mapper;

    @Transactional
    public SolicitudIAChatResponse procesar(Long proyectoId, SolicitudIAChatRequest request, String correo) {
        Usuario usuario = accessService.requireUser(correo);
        Proyecto proyecto = accessService.requireProjectAccess(proyectoId, usuario);
        solicitudRepository.bloquearProyecto(proyectoId);

        var existente = solicitudRepository.findByProyectoIdAndSolicitudId(proyectoId, request.solicitudId());
        if (existente.isPresent()) return respuestaExistente(existente.get(), usuario);

        Diagrama diagrama = accessService.requireDiagramAccess(request.diagramaId(), correo);
        if (!proyectoId.equals(diagrama.getProyecto().getId()) || Boolean.FALSE.equals(diagrama.getActivo())) {
            throw new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado en el proyecto");
        }
        MensajeChatProyecto mensajeUsuario = mensajeRepository.findById(request.mensajeId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Mensaje de usuario no encontrado"));
        validarMensajeUsuario(mensajeUsuario, proyectoId, usuario);

        SolicitudIAChatProyecto solicitud = nuevaSolicitud(request, proyecto, diagrama, mensajeUsuario, usuario);
        solicitudRepository.saveAndFlush(solicitud);

        List<MensajeChatProyecto> historial = mensajeRepository
                .findByProyectoIdOrderByFechaHoraDescIdDesc(proyectoId, PageRequest.of(0, 30));
        List<Bitacora> actividades = bitacoraRepository
                .findByProyectoIdOrderByFechaHoraDesc(proyectoId, PageRequest.of(0, 20));
        String prompt = promptBuilder.build(diagrama, historial, actividades, mensajeUsuario);

        List<String> errores = new ArrayList<>();
        for (ChatIAProvider provider : providers.stream()
                .sorted(Comparator.comparingInt(ChatIAProvider::getPriority)).toList()) {
            if (!provider.isAvailable()) {
                errores.add(provider.getName() + ": " + provider.getUnavailableReason());
                continue;
            }
            try {
                ChatIAProviderResult result = provider.generate(prompt);
                ChatIAParsedResponse parsed = responseParser.parse(result.structuredJson(), diagrama);
                MensajeChatResponse mensaje = persistirExito(proyecto, diagrama, mensajeUsuario,
                        solicitud, provider, result, parsed, request.solicitudId());
                return new SolicitudIAChatResponse(request.solicitudId(),
                        EstadoSolicitudIAChat.COMPLETADA, provider.getName(), mensaje);
            } catch (ChatIAProviderException e) {
                errores.add(provider.getName() + ": " + mensajeSeguro(e));
            }
        }
        return persistirError(proyecto, diagrama, mensajeUsuario, solicitud, errores, request.solicitudId());
    }

    private MensajeChatResponse persistirExito(Proyecto proyecto, Diagrama diagrama,
            MensajeChatProyecto mensajeUsuario, SolicitudIAChatProyecto solicitud,
            ChatIAProvider provider, ChatIAProviderResult result, ChatIAParsedResponse parsed,
            String solicitudId) {
        var metadata = mapper.createObjectNode();
        metadata.put("cu", "CU16");
        metadata.put("solicitudId", solicitudId);
        metadata.put("proveedor", provider.getName());
        metadata.put("diagramaId", diagrama.getId());
        if (diagrama.getVersion() != null) metadata.put("diagramaVersion", diagrama.getVersion());
        metadata.put("mensajeUsuarioId", mensajeUsuario.getId());
        if (result.tokensUsed() != null) metadata.put("tokensUsados", result.tokensUsed());
        metadata.put("recomendacionesDescartadas", parsed.recomendacionesDescartadas());
        metadata.put("requiereConfirmacion", !parsed.recomendaciones().isEmpty());
        metadata.set("recomendaciones", mapper.valueToTree(parsed.recomendaciones()));
        MensajeChatResponse mensaje = chatService.persistirMensajeInterno(proyecto, TipoEmisorChat.IA,
                parsed.respuesta(), EstadoMensajeChat.COMPLETADO,
                mensajeUsuario.getCorrelacionId(), metadata);
        solicitud.setEstado(EstadoSolicitudIAChat.COMPLETADA);
        solicitud.setProveedor(provider.getName());
        solicitud.setMensajeRespuesta(mensajeRepository.getReferenceById(mensaje.id()));
        solicitud.setFechaFinalizacion(LocalDateTime.now());
        solicitudRepository.save(solicitud);
        return mensaje;
    }

    private SolicitudIAChatResponse persistirError(Proyecto proyecto, Diagrama diagrama,
            MensajeChatProyecto mensajeUsuario, SolicitudIAChatProyecto solicitud,
            List<String> errores, String solicitudId) {
        String detalle = recortar(String.join(" | ", errores), MAX_ERROR_DETAIL);
        var metadata = mapper.createObjectNode();
        metadata.put("cu", "CU16");
        metadata.put("solicitudId", solicitudId);
        metadata.put("diagramaId", diagrama.getId());
        metadata.put("mensajeUsuarioId", mensajeUsuario.getId());
        metadata.put("detalle", detalle);
        MensajeChatResponse mensaje = chatService.persistirMensajeInterno(proyecto, TipoEmisorChat.SISTEMA,
                "No fue posible obtener una respuesta de IA. Revisa la configuracion o disponibilidad de los proveedores.",
                EstadoMensajeChat.ERROR, mensajeUsuario.getCorrelacionId(), metadata);
        solicitud.setEstado(EstadoSolicitudIAChat.ERROR);
        solicitud.setDetalleError(detalle);
        solicitud.setMensajeRespuesta(mensajeRepository.getReferenceById(mensaje.id()));
        solicitud.setFechaFinalizacion(LocalDateTime.now());
        solicitudRepository.save(solicitud);
        return new SolicitudIAChatResponse(solicitudId, EstadoSolicitudIAChat.ERROR, null, mensaje);
    }

    private SolicitudIAChatResponse respuestaExistente(SolicitudIAChatProyecto solicitud, Usuario usuario) {
        if (!solicitud.getSolicitante().getId().equals(usuario.getId())) {
            throw new AccessDeniedException("La solicitud pertenece a otro usuario");
        }
        MensajeChatResponse mensaje = solicitud.getMensajeRespuesta() == null
                ? null : chatService.toResponse(solicitud.getMensajeRespuesta());
        return new SolicitudIAChatResponse(solicitud.getSolicitudId(), solicitud.getEstado(),
                solicitud.getProveedor(), mensaje);
    }

    private void validarMensajeUsuario(MensajeChatProyecto mensaje, Long proyectoId, Usuario usuario) {
        if (!proyectoId.equals(mensaje.getProyecto().getId())
                || mensaje.getTipoEmisor() != TipoEmisorChat.USUARIO
                || mensaje.getUsuarioEmisor() == null
                || !usuario.getId().equals(mensaje.getUsuarioEmisor().getId())) {
            throw new AccessDeniedException("El mensaje no pertenece al usuario autenticado y al proyecto");
        }
    }

    private SolicitudIAChatProyecto nuevaSolicitud(SolicitudIAChatRequest request, Proyecto proyecto,
            Diagrama diagrama, MensajeChatProyecto mensaje, Usuario usuario) {
        SolicitudIAChatProyecto solicitud = new SolicitudIAChatProyecto();
        solicitud.setSolicitudId(request.solicitudId());
        solicitud.setProyecto(proyecto);
        solicitud.setDiagrama(diagrama);
        solicitud.setMensajeUsuario(mensaje);
        solicitud.setSolicitante(usuario);
        solicitud.setEstado(EstadoSolicitudIAChat.PROCESANDO);
        return solicitud;
    }

    private String mensajeSeguro(Exception e) {
        String value = e.getMessage();
        return recortar(value == null ? e.getClass().getSimpleName() : value, 500);
    }

    private String recortar(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
