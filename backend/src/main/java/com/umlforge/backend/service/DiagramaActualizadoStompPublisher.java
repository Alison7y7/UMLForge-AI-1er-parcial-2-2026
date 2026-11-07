package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlEventMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;
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
        message.setElementoId(event.recomendacionId());
        message.setTimestamp(Instant.now().toEpochMilli());
        message.setPayload(Map.of(
                "recomendacionId", event.recomendacionId(),
                "version", event.version(),
                "modeloJson", event.modeloJson()));
        collaborationService.addToHistory(event.diagramaId(), message);
        messagingTemplate.convertAndSend("/topic/diagramas/" + event.diagramaId(), message);
    }
}
