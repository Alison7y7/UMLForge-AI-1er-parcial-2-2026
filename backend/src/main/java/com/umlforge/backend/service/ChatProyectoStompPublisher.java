package com.umlforge.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class ChatProyectoStompPublisher {

    private final SimpMessageSendingOperations messagingTemplate;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void publicar(MensajeChatPublicadoEvent event) {
        messagingTemplate.convertAndSend(
                "/topic/proyectos/" + event.proyectoId() + "/chat",
                event.mensaje());
    }
}
