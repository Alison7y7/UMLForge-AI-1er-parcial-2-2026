package com.umlforge.backend.service;

import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.entity.EstadoMensajeChat;
import com.umlforge.backend.entity.TipoEmisorChat;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.lang.reflect.Method;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class ChatProyectoStompPublisherTest {

    @Test
    void emiteUnaVezAlCanalDelProyectoConContratoRest() throws Exception {
        SimpMessageSendingOperations messaging = mock(SimpMessageSendingOperations.class);
        ChatProyectoStompPublisher publisher = new ChatProyectoStompPublisher(messaging);
        MensajeChatResponse response = new MensajeChatResponse(
                1L, 8L, 2L, "Usuario", TipoEmisorChat.USUARIO, "Hola",
                LocalDateTime.now(), EstadoMensajeChat.ENVIADO, "corr", null);

        publisher.publicar(new MensajeChatPublicadoEvent(8L, response));

        verify(messaging).convertAndSend("/topic/proyectos/8/chat", response);
        Method method = ChatProyectoStompPublisher.class
                .getMethod("publicar", MensajeChatPublicadoEvent.class);
        assertThat(method.getAnnotation(TransactionalEventListener.class).phase())
                .isEqualTo(TransactionPhase.AFTER_COMMIT);
    }
}
