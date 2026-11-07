package com.umlforge.backend.controller;

import com.umlforge.backend.dto.UmlEventMessage;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.CollaborationService;
import com.umlforge.backend.service.ProjectAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class UmlSyncControllerSecurityTest {

    @Test
    void colaboracionConservaBroadcastPeroSobrescribeIdentidadCliente() {
        SimpMessageSendingOperations messaging = mock(SimpMessageSendingOperations.class);
        CollaborationService collaboration = mock(CollaborationService.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        ProjectAccessService access = mock(ProjectAccessService.class);
        UmlSyncController controller = new UmlSyncController(messaging, collaboration, usuarios, access);
        Usuario real = new Usuario();
        real.setId(12L);
        real.setNombre("Usuario");
        real.setApellido("Real");
        real.setCorreo("real@test");
        when(usuarios.findByCorreo("real@test")).thenReturn(Optional.of(real));
        UmlEventMessage event = new UmlEventMessage();
        event.setTipoEvento("MOVE_NODE");
        event.setUsuarioId(999L);
        event.setUsuarioNombre("Falso");

        controller.handleEvent(20L, event, headers("real@test"));

        verify(access).requireDiagramAccess(20L, "real@test");
        verify(collaboration).addToHistory(20L, event);
        verify(messaging).convertAndSend("/topic/diagramas/20", event);
        org.assertj.core.api.Assertions.assertThat(event.getUsuarioId()).isEqualTo(12L);
        org.assertj.core.api.Assertions.assertThat(event.getUsuarioNombre()).isEqualTo("Usuario Real");
        org.assertj.core.api.Assertions.assertThat(event.getDiagramaId()).isEqualTo(20L);
    }

    @Test
    void colaboracionNoPublicaCuandoDiagramaEsAjeno() {
        SimpMessageSendingOperations messaging = mock(SimpMessageSendingOperations.class);
        CollaborationService collaboration = mock(CollaborationService.class);
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        ProjectAccessService access = mock(ProjectAccessService.class);
        UmlSyncController controller = new UmlSyncController(messaging, collaboration, usuarios, access);
        doThrow(new AccessDeniedException("ajeno"))
                .when(access).requireDiagramAccess(21L, "intruso@test");

        assertThatThrownBy(() -> controller.handleEvent(
                21L, new UmlEventMessage(), headers("intruso@test")))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(messaging, collaboration, usuarios);
    }

    private SimpMessageHeaderAccessor headers(String email) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setUser(new UsernamePasswordAuthenticationToken(email, null, List.of()));
        return accessor;
    }
}
