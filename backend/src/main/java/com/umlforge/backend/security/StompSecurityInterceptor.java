package com.umlforge.backend.security;

import com.umlforge.backend.service.ProjectAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class StompSecurityInterceptor implements ChannelInterceptor {

    private static final Pattern DIAGRAM_TOPIC = Pattern.compile("^/topic/diagramas/(\\d+)$");
    private static final Pattern CHAT_TOPIC = Pattern.compile(
            "^/topic/proyectos/(\\d+)/chat(?:/estado-ia)?$");
    private static final Pattern DIAGRAM_COMMAND = Pattern.compile(
            "^/app/diagramas/(\\d+)/(join|presence|lock|event)$");

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final ProjectAccessService projectAccessService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(message, accessor);
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscribe(message, accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            authorizeSend(message, accessor);
        }
        return message;
    }

    private void authenticateConnect(Message<?> message, StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null) authHeader = accessor.getFirstNativeHeader("authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw denied(message, "Autenticación STOMP requerida", null);
        }

        try {
            String token = authHeader.substring(7);
            String username = jwtUtil.extractUsername(token);
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtUtil.validateToken(token, userDetails)) {
                throw denied(message, "Token STOMP inválido", null);
            }
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
            accessor.setUser(authentication);
        } catch (MessageDeliveryException e) {
            throw e;
        } catch (Exception e) {
            throw denied(message, "Token STOMP inválido", e);
        }
    }

    private void authorizeSubscribe(Message<?> message, StompHeaderAccessor accessor) {
        Authentication authentication = requireAuthentication(message, accessor);
        String destination = accessor.getDestination();
        Matcher diagram = destination == null ? null : DIAGRAM_TOPIC.matcher(destination);
        Matcher chat = destination == null ? null : CHAT_TOPIC.matcher(destination);
        try {
            if (diagram != null && diagram.matches()) {
                projectAccessService.requireDiagramAccess(Long.valueOf(diagram.group(1)), authentication.getName());
                return;
            }
            if (chat != null && chat.matches()) {
                projectAccessService.requireProjectAccess(Long.valueOf(chat.group(1)), authentication.getName());
                return;
            }
        } catch (RuntimeException e) {
            throw denied(message, "Suscripción STOMP no autorizada", e);
        }
        throw denied(message, "Destino de suscripción privado desconocido", null);
    }

    private void authorizeSend(Message<?> message, StompHeaderAccessor accessor) {
        Authentication authentication = requireAuthentication(message, accessor);
        String destination = accessor.getDestination();
        Matcher diagram = destination == null ? null : DIAGRAM_COMMAND.matcher(destination);
        if (diagram == null || !diagram.matches()) {
            throw denied(message, "Destino de envío privado desconocido", null);
        }
        try {
            projectAccessService.requireDiagramAccess(Long.valueOf(diagram.group(1)), authentication.getName());
        } catch (RuntimeException e) {
            throw denied(message, "Envío STOMP no autorizado", e);
        }
    }

    private Authentication requireAuthentication(Message<?> message, StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof Authentication authentication)
                || !authentication.isAuthenticated()) {
            throw denied(message, "Sesión STOMP no autenticada", null);
        }
        return authentication;
    }

    private MessageDeliveryException denied(Message<?> message, String reason, Throwable cause) {
        return cause == null
                ? new MessageDeliveryException(message, reason)
                : new MessageDeliveryException(message, reason, cause);
    }
}
