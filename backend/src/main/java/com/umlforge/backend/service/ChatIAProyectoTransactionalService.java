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
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

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
    private final UmlDeterministicReviewService deterministicReviewService;
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

        List<MensajeChatProyecto> historialBase = mensajeRepository
                .findByProyectoIdOrderByFechaHoraDescIdDesc(proyectoId, PageRequest.of(0, 80)).stream()
                .filter(message -> !Objects.equals(message.getId(), mensajeUsuario.getId())).toList();
        List<Bitacora> actividadesBase = bitacoraRepository
                .findByProyectoIdOrderByFechaHoraDesc(proyectoId, PageRequest.of(0, 60));
        List<MensajeChatProyecto> historial = relevantes(historialBase, mensajeUsuario.getContenido(), 18,
                message -> message.getContenido());
        List<Bitacora> actividades = relevantes(actividadesBase, mensajeUsuario.getContenido(), 12,
                activity -> activity.getAccion() + " " + activity.getDescripcion());
        String evidencia = evidenciaPersistida(historial, actividades);
        String prompt = promptBuilder.build(diagrama, historial, actividades, mensajeUsuario, evidencia);

        if (preguntaHistorica(mensajeUsuario.getContenido()) && historial.isEmpty() && actividades.isEmpty()) {
            return persistirSinEvidencia(proyecto, diagrama, mensajeUsuario, solicitud, request.solicitudId());
        }

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
        boolean review = isReviewRequest(mensajeUsuario);
        metadata.put("cu", review ? "CU17" : "CU16");
        metadata.put("solicitudId", solicitudId);
        metadata.put("proveedor", provider.getName());
        metadata.put("diagramaId", diagrama.getId());
        if (diagrama.getVersion() != null) metadata.put("diagramaVersion", diagrama.getVersion());
        metadata.put("mensajeUsuarioId", mensajeUsuario.getId());
        if (result.tokensUsed() != null) metadata.put("tokensUsados", result.tokensUsed());
        metadata.put("recomendacionesDescartadas", parsed.recomendacionesDescartadas());
        metadata.put("requiereConfirmacion", !parsed.recomendaciones().isEmpty());
        metadata.set("recomendaciones", mapper.valueToTree(parsed.recomendaciones()));
        metadata.set("alternativas", mapper.valueToTree(parsed.alternativas()));
        metadata.put("requiereSeleccionAlternativa", !parsed.alternativas().isEmpty());
        if (review) {
            List<com.umlforge.backend.dto.HallazgoRevisionUml> findings = new ArrayList<>(
                    deterministicReviewService.analyze(diagrama));
            findings.addAll(parsed.hallazgos());
            metadata.put("tipoInforme", "REVISION_UML");
            metadata.put("diagramaNombre", diagrama.getNombre());
            metadata.put("fechaRevision", LocalDateTime.now().toString());
            metadata.put("solicitanteId", mensajeUsuario.getUsuarioEmisor().getId());
            metadata.put("solicitanteNombre", fullName(mensajeUsuario.getUsuarioEmisor()));
            metadata.put("resumenRevision", parsed.respuesta());
            metadata.set("hallazgos", mapper.valueToTree(findings));
        }
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

    private boolean isReviewRequest(MensajeChatProyecto request) {
        try {
            return "REVISION_UML".equals(mapper.readTree(request.getMetadatos()).path("tipoSolicitud").asText());
        } catch (Exception ignored) {
            return false;
        }
    }

    private String fullName(Usuario user) {
        String full = ((user.getNombre() == null ? "" : user.getNombre()) + " "
                + (user.getApellido() == null ? "" : user.getApellido())).trim();
        return full.isBlank() ? user.getCorreo() : full;
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

    private <T> List<T> relevantes(List<T> candidates, String query, int limit,
            java.util.function.Function<T, String> textExtractor) {
        Set<String> terms = new HashSet<>();
        for (String value : query.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (value.length() >= 4) terms.add(value);
        }
        boolean temporal = query.toLowerCase(Locale.ROOT).matches(".*(ayer|hoy|antes|ultimo|último|reciente|pendiente|historial|cambio).*" );
        List<T> selected = new ArrayList<>();
        for (T candidate : candidates) {
            String text = String.valueOf(textExtractor.apply(candidate)).toLowerCase(Locale.ROOT);
            if (temporal || terms.stream().anyMatch(text::contains)) selected.add(candidate);
            if (selected.size() == limit) break;
        }
        if (selected.isEmpty()) selected.addAll(candidates.stream().limit(Math.min(6, limit)).toList());
        return selected;
    }

    private String evidenciaPersistida(List<MensajeChatProyecto> messages, List<Bitacora> activities) {
        if (messages.isEmpty() && activities.isEmpty()) {
            return "No se encontraron registros persistidos relevantes; indicalo sin completar vacios con suposiciones.";
        }
        return "La evidencia siguiente fue recuperada de PostgreSQL y puede contener propuestas, no hechos. "
                + "Solo los mensajes SISTEMA y acciones de bitacora que declaran una aplicacion representan acciones ejecutadas. "
                + "Las respuestas IA y sus recomendaciones siguen siendo propuestas salvo evidencia explicita de aplicacion.";
    }

    private boolean preguntaHistorica(String query) {
        return query.toLowerCase(Locale.ROOT)
                .matches(".*(ayer|anterior|historial|ultima sesión|última sesión|hicimos|decidimos|aprobamos|pendiente).*" );
    }

    private SolicitudIAChatResponse persistirSinEvidencia(Proyecto proyecto, Diagrama diagrama,
            MensajeChatProyecto mensajeUsuario, SolicitudIAChatProyecto solicitud, String solicitudId) {
        String response = "No se encontró evidencia histórica suficiente en los registros persistidos de este proyecto para responder esa pregunta.";
        var metadata = mapper.createObjectNode();
        metadata.put("cu", "CU19");
        metadata.put("solicitudId", solicitudId);
        metadata.put("diagramaId", diagrama.getId());
        metadata.put("evidenciaHistoricaSuficiente", false);
        metadata.putArray("recomendaciones");
        MensajeChatResponse message = chatService.persistirMensajeInterno(proyecto, TipoEmisorChat.IA,
                response, EstadoMensajeChat.COMPLETADO, mensajeUsuario.getCorrelacionId(), metadata);
        solicitud.setEstado(EstadoSolicitudIAChat.COMPLETADA);
        solicitud.setProveedor("contexto-persistido");
        solicitud.setMensajeRespuesta(mensajeRepository.getReferenceById(message.id()));
        solicitud.setFechaFinalizacion(LocalDateTime.now());
        solicitudRepository.save(solicitud);
        return new SolicitudIAChatResponse(solicitudId, EstadoSolicitudIAChat.COMPLETADA,
                "contexto-persistido", message);
    }
}
