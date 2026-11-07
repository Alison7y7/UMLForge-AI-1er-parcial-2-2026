package com.umlforge.backend.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import com.umlforge.backend.dto.HistorialChatResponse;
import com.umlforge.backend.dto.AdjuntoChatResponse;
import com.umlforge.backend.dto.MensajeChatRequest;
import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.entity.EstadoMensajeChat;
import com.umlforge.backend.entity.MensajeChatProyecto;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.TipoEmisorChat;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatProyectoService {

    static final int MAX_METADATA_LENGTH = 16000;

    private final MensajeChatProyectoRepository mensajeRepository;
    private final ProjectAccessService projectAccessService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final ChatAttachmentStorageService attachmentStorage;

    @Transactional(readOnly = true)
    public HistorialChatResponse obtenerHistorial(
            Long proyectoId, String correo, int pagina, int tamano) {
        projectAccessService.requireProjectAccess(proyectoId, correo);
        PageRequest pageable = PageRequest.of(pagina, tamano,
                Sort.by(Sort.Order.desc("fechaHora"), Sort.Order.desc("id")));
        Page<MensajeChatProyecto> result = mensajeRepository.findByProyectoId(proyectoId, pageable);
        return new HistorialChatResponse(
                result.getContent().stream().map(this::toResponse).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(),
                result.getTotalPages(), result.isLast());
    }

    @Transactional
    public MensajeChatResponse enviarMensaje(
            Long proyectoId, MensajeChatRequest request, String correo) {
        Usuario emisor = projectAccessService.requireUser(correo);
        Proyecto proyecto = projectAccessService.requireProjectAccess(proyectoId, emisor);

        MensajeChatProyecto mensaje = new MensajeChatProyecto();
        mensaje.setProyecto(proyecto);
        mensaje.setUsuarioEmisor(emisor);
        mensaje.setTipoEmisor(TipoEmisorChat.USUARIO);
        mensaje.setContenido(request.getContenido().trim());
        mensaje.setEstado(EstadoMensajeChat.ENVIADO);
        mensaje.setMetadatos(serializeMetadata(request.getMetadatos()));

        MensajeChatProyecto guardado = mensajeRepository.saveAndFlush(mensaje);
        MensajeChatResponse response = toResponse(guardado);
        eventPublisher.publishEvent(new MensajeChatPublicadoEvent(proyectoId, response));
        return response;
    }

    @Transactional
    public MensajeChatResponse enviarMensajeConAdjuntos(Long proyectoId, String contenido,
            String metadatosJson, List<MultipartFile> files, String correo) {
        String texto = contenido == null ? "" : contenido.trim();
        if ((files == null || files.isEmpty()) && texto.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "El mensaje requiere texto o al menos un adjunto");
        }
        if (files != null && files.size() > 5) {
            throw new ResponseStatusException(BAD_REQUEST, "Se permiten como maximo 5 adjuntos por mensaje");
        }
        long total = files == null ? 0 : files.stream().mapToLong(MultipartFile::getSize).sum();
        if (total > attachmentStorage.getMaxFileBytes() * 2) {
            throw new ResponseStatusException(PAYLOAD_TOO_LARGE, "Los adjuntos superan el limite total permitido");
        }

        Usuario emisor = projectAccessService.requireUser(correo);
        Proyecto proyecto = projectAccessService.requireProjectAccess(proyectoId, emisor);
        List<ChatAttachmentStorageService.PreparedAttachment> prepared = new ArrayList<>();
        try {
            if (files != null) {
                for (MultipartFile file : files) prepared.add(attachmentStorage.prepare(file, proyecto));
            }

            MensajeChatProyecto mensaje = new MensajeChatProyecto();
            mensaje.setProyecto(proyecto);
            mensaje.setUsuarioEmisor(emisor);
            mensaje.setTipoEmisor(TipoEmisorChat.USUARIO);
            mensaje.setContenido(texto);
            mensaje.setEstado(EstadoMensajeChat.ENVIADO);
            if (metadatosJson != null && !metadatosJson.isBlank()) {
                mensaje.setMetadatos(serializeMetadata(objectMapper.readTree(metadatosJson)));
            }
            for (var item : prepared) mensaje.addAdjunto(item.entity());

            MensajeChatProyecto guardado = mensajeRepository.saveAndFlush(mensaje);
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        if (status != TransactionSynchronization.STATUS_COMMITTED) {
                            prepared.forEach(attachmentStorage::cleanup);
                        }
                    }
                });
            }
            for (var item : prepared) attachmentStorage.commit(item);
            MensajeChatResponse response = toResponse(guardado);
            eventPublisher.publishEvent(new MensajeChatPublicadoEvent(proyectoId, response));
            return response;
        } catch (JacksonException e) {
            prepared.forEach(attachmentStorage::cleanup);
            throw new ResponseStatusException(BAD_REQUEST, "Los metadatos no son JSON valido", e);
        } catch (RuntimeException e) {
            prepared.forEach(attachmentStorage::cleanup);
            throw e;
        }
    }

    MensajeChatResponse persistirMensajeInterno(Proyecto proyecto, TipoEmisorChat tipo,
            String contenido, EstadoMensajeChat estado, String correlacionId, JsonNode metadata) {
        if (tipo == TipoEmisorChat.USUARIO) {
            throw new IllegalArgumentException("Los mensajes de usuario requieren el flujo autenticado");
        }
        MensajeChatProyecto mensaje = new MensajeChatProyecto();
        mensaje.setProyecto(proyecto);
        mensaje.setTipoEmisor(tipo);
        mensaje.setContenido(contenido);
        mensaje.setEstado(estado);
        mensaje.setCorrelacionId(correlacionId);
        mensaje.setMetadatos(serializeMetadata(metadata));
        MensajeChatProyecto guardado = mensajeRepository.saveAndFlush(mensaje);
        MensajeChatResponse response = toResponse(guardado);
        eventPublisher.publishEvent(new MensajeChatPublicadoEvent(proyecto.getId(), response));
        return response;
    }

    String serializeMetadata(JsonNode metadata) {
        if (metadata == null || metadata.isNull()) return null;
        if (!metadata.isObject()) {
            throw new ResponseStatusException(BAD_REQUEST, "Los metadatos deben ser un objeto JSON");
        }
        try {
            String value = objectMapper.writeValueAsString(metadata);
            if (value.length() > MAX_METADATA_LENGTH) {
                throw new ResponseStatusException(BAD_REQUEST, "Los metadatos son demasiado extensos");
            }
            return value;
        } catch (JacksonException e) {
            throw new ResponseStatusException(BAD_REQUEST, "Los metadatos no son JSON válido", e);
        }
    }

    MensajeChatResponse toResponse(MensajeChatProyecto mensaje) {
        Usuario emisor = mensaje.getUsuarioEmisor();
        String nombreEmisor = emisor == null
                ? (mensaje.getTipoEmisor() == TipoEmisorChat.IA ? "UMLForge IA" : "Sistema")
                : nombreCompleto(emisor);
        return new MensajeChatResponse(
                mensaje.getId(),
                mensaje.getProyecto().getId(),
                emisor == null ? null : emisor.getId(),
                nombreEmisor,
                mensaje.getTipoEmisor(),
                mensaje.getContenido(),
                mensaje.getFechaHora().toInstant(ZoneOffset.UTC),
                mensaje.getEstado(),
                mensaje.getCorrelacionId(),
                parseMetadata(mensaje.getMetadatos()),
                mensaje.getAdjuntos().stream().map(a -> new AdjuntoChatResponse(
                        a.getId(), a.getNombreOriginal(), a.getTamanoBytes(), a.getMimeType(),
                        a.getCategoria(), "/api/proyectos/" + mensaje.getProyecto().getId()
                                + "/chat/adjuntos/" + a.getId() + "/contenido"
                )).toList());
    }

    private JsonNode parseMetadata(String metadata) {
        if (metadata == null || metadata.isBlank()) return null;
        try {
            return objectMapper.readTree(metadata);
        } catch (JacksonException e) {
            throw new IllegalStateException("Metadatos persistidos inválidos", e);
        }
    }

    private String nombreCompleto(Usuario usuario) {
        String nombre = usuario.getNombre() == null ? "" : usuario.getNombre().trim();
        String apellido = usuario.getApellido() == null ? "" : usuario.getApellido().trim();
        String completo = (nombre + " " + apellido).trim();
        return completo.isEmpty() ? usuario.getCorreo() : completo;
    }
}
