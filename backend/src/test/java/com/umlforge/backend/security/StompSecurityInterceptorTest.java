package com.umlforge.backend.security;

import com.umlforge.backend.service.ProjectAccessService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class StompSecurityInterceptorTest {

    private JwtUtil jwtUtil;
    private UserDetailsService userDetailsService;
    private ProjectAccessService projectAccessService;
    private StompSecurityInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtUtil = mock(JwtUtil.class);
        userDetailsService = mock(UserDetailsService.class);
        projectAccessService = mock(ProjectAccessService.class);
        interceptor = new StompSecurityInterceptor(jwtUtil, userDetailsService, projectAccessService);
    }

    @Test
    void connectRechazaSesionSinToken() {
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.CONNECT, null, null), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void connectUsaIdentidadDelTokenAunqueClienteEnvieLoginFalso() {
        UserDetails real = new User("real@umlforge.test", "x", List.of());
        when(jwtUtil.extractUsername("token-valido")).thenReturn(real.getUsername());
        when(userDetailsService.loadUserByUsername(real.getUsername())).thenReturn(real);
        when(jwtUtil.validateToken("token-valido", real)).thenReturn(true);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer token-valido");
        accessor.setNativeHeader("login", "suplantado@umlforge.test");
        accessor.setLeaveMutable(true);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        interceptor.preSend(message, null);

        assertThat(accessor.getUser()).isNotNull();
        assertThat(accessor.getUser().getName()).isEqualTo("real@umlforge.test");
    }

    @Test
    void subscribeChatAutorizaProyectoPropio() {
        interceptor.preSend(message(StompCommand.SUBSCRIBE,
                "/topic/proyectos/41/chat", auth("miembro@umlforge.test")), null);

        verify(projectAccessService).requireProjectAccess(41L, "miembro@umlforge.test");
    }

    @Test
    void subscribeChatRechazaProyectoAjeno() {
        doThrow(new AccessDeniedException("ajeno"))
                .when(projectAccessService).requireProjectAccess(42L, "intruso@umlforge.test");

        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE,
                "/topic/proyectos/42/chat", auth("intruso@umlforge.test")), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void protegeColaboracionDeDiagramasYRechazaDestinosManipulados() {
        interceptor.preSend(message(StompCommand.SEND,
                "/app/diagramas/7/event", auth("miembro@umlforge.test")), null);
        verify(projectAccessService).requireDiagramAccess(7L, "miembro@umlforge.test");

        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SUBSCRIBE,
                "/topic/proyectos/7/chat/../../privado", auth("miembro@umlforge.test")), null))
                .isInstanceOf(MessageDeliveryException.class);
        assertThatThrownBy(() -> interceptor.preSend(message(StompCommand.SEND,
                "/app/proyectos/7/chat", auth("miembro@umlforge.test")), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    private UsernamePasswordAuthenticationToken auth(String email) {
        return new UsernamePasswordAuthenticationToken(email, null, List.of());
    }

    private Message<byte[]> message(StompCommand command, String destination,
                                    UsernamePasswordAuthenticationToken authentication) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) accessor.setDestination(destination);
        if (authentication != null) accessor.setUser(authentication);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
