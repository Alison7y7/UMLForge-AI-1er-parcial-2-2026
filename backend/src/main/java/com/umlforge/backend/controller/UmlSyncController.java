package com.umlforge.backend.controller;

import com.umlforge.backend.dto.UmlEventMessage;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.CollaborationService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

@Controller
public class UmlSyncController {

    private final SimpMessageSendingOperations messagingTemplate;
    private final CollaborationService collaborationService;
    private final UsuarioRepository usuarioRepository;

    public UmlSyncController(SimpMessageSendingOperations messagingTemplate, CollaborationService collaborationService, UsuarioRepository usuarioRepository) {
        this.messagingTemplate = messagingTemplate;
        this.collaborationService = collaborationService;
        this.usuarioRepository = usuarioRepository;
    }

    @MessageMapping("/diagramas/{diagramaId}/join")
    public void joinSession(@DestinationVariable Long diagramaId, SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() != null) {
            String email = headerAccessor.getUser().getName();
            collaborationService.userJoined(headerAccessor.getSessionId(), diagramaId, email);
        }
    }

    @MessageMapping("/diagramas/{diagramaId}/lock")
    public void lockElement(@DestinationVariable Long diagramaId, @Payload UmlEventMessage event, SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() == null) return;
        Usuario user = usuarioRepository.findByCorreo(headerAccessor.getUser().getName()).orElse(null);
        if (user == null) return;
        
        Long userId = user.getId();
        event.setUsuarioId(userId);
        event.setUsuarioNombre(user.getNombre());
        
        if ("LOCK_ELEMENT".equals(event.getTipoEvento())) {
            boolean success = collaborationService.lockElement(diagramaId, event.getElementoId(), userId);
            if (success) {
                collaborationService.addToHistory(diagramaId, event);
                messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, event);
            } else {
                // Not locked, maybe send a private fail event, but we can also broadcast nothing, frontend checks response.
                // Wait, STOMP frontend doesn't easily wait for response on send, we can broadcast a LOCK_FAILED or just let the lock broadcast tell everyone.
                // If it fails, we send LOCK_FAILED to the user? We can just send a generic broadcast of who has the lock if needed.
                // Let's assume frontend checks if they got the lock broadcast, or we send a specific error topic.
                // We'll broadcast the lock event to everyone if successful.
            }
        } else if ("UNLOCK_ELEMENT".equals(event.getTipoEvento())) {
            collaborationService.unlockElement(diagramaId, event.getElementoId(), userId);
            collaborationService.addToHistory(diagramaId, event);
                messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, event);
        }
    }

    @MessageMapping("/diagramas/{diagramaId}/event")
    public void handleEvent(@DestinationVariable Long diagramaId, @Payload UmlEventMessage event, SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() != null) {
            Usuario user = usuarioRepository.findByCorreo(headerAccessor.getUser().getName()).orElse(null);
            if (user != null) {
                event.setUsuarioId(user.getId());
                event.setUsuarioNombre(user.getNombre());
                
                // We don't save to DB here yet because the prompt says 
                // "Después de modificaciones: actualizar modelJson del diagrama... [Guardar] en barra superior".
                // We can let the REST save handle the persistency, OR update it here.
                // We'll broadcast it real-time.
                collaborationService.addToHistory(diagramaId, event);
                messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, event);
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        collaborationService.userLeft(headerAccessor.getSessionId());
    }
}

