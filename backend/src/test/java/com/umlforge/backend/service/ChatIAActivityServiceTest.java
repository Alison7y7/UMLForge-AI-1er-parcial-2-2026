package com.umlforge.backend.service;

import com.umlforge.backend.entity.Usuario;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageSendingOperations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ChatIAActivityServiceTest {
    @Test
    void publicaInicioMantieneSnapshotYPublicaFinSinPersistencia() {
        SimpMessageSendingOperations messaging = mock(SimpMessageSendingOperations.class);
        ChatIAActivityService service = new ChatIAActivityService(messaging);
        Usuario user = new Usuario(); user.setId(5L); user.setNombre("Noe"); user.setApellido("Ali");

        service.iniciar(2L, "request-1", user);
        assertThat(service.snapshot(2L)).singleElement().satisfies(activity -> {
            assertThat(activity.estado()).isEqualTo("INICIO");
            assertThat(activity.usuarioNombre()).isEqualTo("Noe Ali");
        });

        service.finalizar(2L, "request-1", user);
        assertThat(service.snapshot(2L)).isEmpty();
        verify(messaging, times(2)).convertAndSend(eq("/topic/proyectos/2/chat/estado-ia"), any(Object.class));
    }
}
