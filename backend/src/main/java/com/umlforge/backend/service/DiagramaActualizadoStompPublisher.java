package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlEventMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DiagramaActualizadoStompPublisher {
    private final SimpMessageSendingOperations messagingTemplate;
    private final CollaborationService collaborationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publicar(DiagramaActualizadoEvent event) {
        UmlEventMessage message = new UmlEventMessage();
        message.setTipoEvento("DIAGRAM_MODEL_UPDATED");
        message.setDiagramaId(event.diagramaId());
        message.setUsuarioId(event.usuarioId());
        message.setUsuarioNombre(event.usuarioNombre());
        message.setElementoId(event.changeId());
        message.setTimestamp(Instant.now().toEpochMilli());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("changeId", event.changeId());
        payload.put("updateType", event.updateType());
        if ("AI_RECOMMENDATION".equals(event.updateType())) {
            payload.put("recomendacionId", event.changeId());
        }
        payload.put("nombre", event.diagramName());
        payload.put("version", event.version());
        payload.put("modeloJson", event.modeloJson());
        message.setPayload(payload);
        collaborationService.addToHistory(event.diagramaId(), message);
        messagingTemplate.convertAndSend("/topic/diagramas/" + event.diagramaId(), message);
    }
}
