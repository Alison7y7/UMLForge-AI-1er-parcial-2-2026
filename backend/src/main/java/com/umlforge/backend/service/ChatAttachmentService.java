package com.umlforge.backend.service;

import com.umlforge.backend.entity.AdjuntoChatProyecto;
import com.umlforge.backend.repository.AdjuntoChatProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ChatAttachmentService {
    private final AdjuntoChatProyectoRepository repository;
    private final ProjectAccessService projectAccessService;
    private final ChatAttachmentStorageService storage;

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> descargar(Long proyectoId, String attachmentId, String correo) {
        projectAccessService.requireProjectAccess(proyectoId, correo);
        AdjuntoChatProyecto attachment = repository.findById(attachmentId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Adjunto no encontrado"));
        if (!attachment.getProyecto().getId().equals(proyectoId)) {
            throw new ResponseStatusException(NOT_FOUND, "Adjunto no encontrado");
        }
        Resource resource = storage.load(attachment);
        boolean inline = attachment.getCategoria().name().equals("IMAGEN")
                || attachment.getCategoria().name().equals("AUDIO")
                || "application/pdf".equals(attachment.getMimeType());
        ContentDisposition disposition = (inline
                ? ContentDisposition.inline()
                : ContentDisposition.attachment())
                .filename(attachment.getNombreOriginal(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getMimeType()))
                .contentLength(attachment.getTamanoBytes())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(resource);
    }
}
