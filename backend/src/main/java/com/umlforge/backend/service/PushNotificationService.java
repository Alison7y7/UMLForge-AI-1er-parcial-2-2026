package com.umlforge.backend.service;

import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {
    private final PushSubscriptionRepository subscriptions;
    private final PushPreferenceRepository preferences;
    private final PushDeliveryRepository deliveries;
    private final ParticipanteProyectoRepository participants;
    private final ProyectoRepository projects;
    private final ProjectAccessService access;
    private final ObjectMapper mapper;
    private final WebPushGateway gateway;
    @Value("${push.vapid.public-key:}") private String publicKey;
    @Value("${push.vapid.private-key:}") private String privateKey;
    @Value("${push.enabled:true}") private boolean enabled;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onNotification(PushNotificationEvent event) {
        deliver(event);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onDiagramUpdated(DiagramaActualizadoEvent event) {
        boolean recommendation = "AI_RECOMMENDATION".equals(event.updateType());
        deliver(new PushNotificationEvent(
                "diagram:" + event.diagramaId() + ":" + event.version() + ":" + event.changeId(),
                recommendation ? PushCategory.RECOMENDACION : PushCategory.CAMBIO_UML,
                event.proyectoId(), event.usuarioId(), Set.of(),
                recommendation ? "Recomendación aplicada" : "Diagrama UML actualizado",
                clean(event.usuarioNombre(), 60) + (recommendation ? " aplicó una recomendación en " : " guardó cambios en ")
                        + clean(event.diagramName(), 80),
                "/diagramas/" + event.diagramaId()));
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onChatMessage(MensajeChatPublicadoEvent event) {
        var message = event.mensaje();
        if (message.tipoEmisor() == TipoEmisorChat.USUARIO && message.contenido() != null) {
            Set<Long> mentioned = new LinkedHashSet<>();
            String content = message.contenido().toLowerCase(Locale.ROOT);
            participants.findByProyectoId(event.proyectoId()).stream()
                    .filter(p -> Boolean.TRUE.equals(p.getActivo()) && p.getUsuario().getCorreo() != null)
                    .filter(p -> content.contains("@" + p.getUsuario().getCorreo().toLowerCase(Locale.ROOT))
                            || (p.getUsuario().getNombre() != null && !p.getUsuario().getNombre().isBlank()
                                && content.contains("@" + p.getUsuario().getNombre().toLowerCase(Locale.ROOT))))
                    .forEach(p -> mentioned.add(p.getUsuario().getId()));
            Proyecto project = projects.findById(event.proyectoId()).orElse(null);
            if (project != null && project.getAnfitrion() != null && project.getAnfitrion().getCorreo() != null
                    && (content.contains("@" + project.getAnfitrion().getCorreo().toLowerCase(Locale.ROOT))
                        || (project.getAnfitrion().getNombre() != null && !project.getAnfitrion().getNombre().isBlank()
                            && content.contains("@" + project.getAnfitrion().getNombre().toLowerCase(Locale.ROOT))))) {
                mentioned.add(project.getAnfitrion().getId());
            }
            if (content.contains("@todos") || content.contains("@all")) {
                if (project != null && project.getAnfitrion() != null) mentioned.add(project.getAnfitrion().getId());
                participants.findByProyectoId(event.proyectoId()).stream()
                        .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                        .forEach(p -> mentioned.add(p.getUsuario().getId()));
            }

            if (!mentioned.isEmpty()) {
                deliver(new PushNotificationEvent("mention:" + message.id(),
                        PushCategory.MENCION, event.proyectoId(), message.emisorId(), mentioned,
                        "Te mencionaron en el chat", clean(message.emisorNombre(), 60) + ": " + clean(message.contenido(), 120),
                        "/proyectos/" + event.proyectoId()));
            } else {
                String projectName = project != null ? project.getNombre() : "Proyecto";
                deliver(new PushNotificationEvent("chat:" + message.id(),
                        PushCategory.MENCION, event.proyectoId(), message.emisorId(), Set.of(),
                        "Mensaje en " + clean(projectName, 40),
                        clean(message.emisorNombre(), 40) + ": " + clean(message.contenido(), 120),
                        "/proyectos/" + event.proyectoId()));
            }
        } else if (message.tipoEmisor() == TipoEmisorChat.SISTEMA
                && message.contenido() != null && !message.contenido().toLowerCase(Locale.ROOT).contains("recomendaci")) {
            deliver(new PushNotificationEvent("decision:" + message.id(), PushCategory.RECOMENDACION,
                    event.proyectoId(), message.emisorId(), Set.of(), "Nueva decisión del equipo",
                    clean(message.contenido(), 150), "/proyectos/" + event.proyectoId() + "?tab=historial"));
        }
    }

    @Transactional
    public void sendToAuthenticatedUser(String email) {
        Usuario user = access.requireUser(email);
        deliver(new PushNotificationEvent("test:" + UUID.randomUUID(), PushCategory.INVITACION,
                null, null, Set.of(user.getId()), "UMLForge AI",
                "Las notificaciones están configuradas correctamente.", "/configuracion/notificaciones"));
    }

    void deliver(PushNotificationEvent event) {
        if (!configured()) return;
        Set<Long> recips = recipients(event);
        log.info("Entregando evento push {} (categoría {}) para {} destinatarios candidatos", event.eventKey(), event.category(), recips.size());
        for (Long recipientId : recips) {
            if (recipientId == null || recipientId.equals(event.actorId()) || !allowed(recipientId, event.category())) continue;
            for (PushSubscription subscription : subscriptions.findByUsuarioIdAndActivaTrue(recipientId)) {
                if (deliveries.existsByEventKeyAndUsuarioIdAndSubscriptionId(event.eventKey(), recipientId, subscription.getId())) continue;
                send(event, recipientId, subscription);
            }
        }
    }

    private Set<Long> recipients(PushNotificationEvent event) {
        if (event.explicitRecipients() != null && !event.explicitRecipients().isEmpty())
            return new LinkedHashSet<>(event.explicitRecipients());
        if (event.projectId() == null) return Set.of();
        Proyecto project = projects.findById(event.projectId()).orElse(null);
        if (project == null) return Set.of();
        Set<Long> result = new LinkedHashSet<>();
        if (project.getAnfitrion() != null) result.add(project.getAnfitrion().getId());
        participants.findByProyectoId(event.projectId()).stream()
                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                .forEach(p -> result.add(p.getUsuario().getId()));
        return result;
    }

    private boolean allowed(Long userId, PushCategory category) {
        PushPreference pref = preferences.findByUsuarioId(userId).orElse(null);
        if (pref == null) return category != PushCategory.CAMBIO_UML;
        return switch (category) {
            case INVITACION -> pref.isInvitaciones();
            case MENCION -> pref.isMenciones();
            case RECOMENDACION -> pref.isRecomendaciones();
            case CAMBIO_UML -> pref.isCambiosUml();
        };
    }

    private void send(PushNotificationEvent event, Long recipientId, PushSubscription subscription) {
        try {
            String payload = mapper.writeValueAsString(Map.of(
                    "title", clean(event.title(), 80), "body", clean(event.body(), 180),
                    "url", safeUrl(event.url()), "tag", clean(event.eventKey(), 100)));
            int status = gateway.send(subscription, payload);
            if (status >= 200 && status < 300) {
                subscription.setUltimoExito(Instant.now()); subscription.setFallosConsecutivos(0);
                subscriptions.save(subscription);
                deliveries.save(new PushDelivery(event.eventKey(), recipientId, subscription.getId()));
                log.info("Push entregado con éxito a usuario {} (subId={})", recipientId, subscription.getId());
            } else if (status == 404 || status == 410) {
                subscription.setActiva(false); subscriptions.save(subscription);
                log.warn("Suscripción {} desactivada por status {}", subscription.getId(), status);
            } else {
                registerFailure(subscription);
                log.warn("Servicio push devolvió status {} para subId {}", status, subscription.getId());
            }
        } catch (Exception e) {
            registerFailure(subscription);
            log.warn("Error enviando push a subId {}: {}", subscription.getId(), e.getMessage(), e);
        }
    }

    private void registerFailure(PushSubscription subscription) {
        int failures = Optional.ofNullable(subscription.getFallosConsecutivos()).orElse(0) + 1;
        subscription.setFallosConsecutivos(failures);
        if (failures >= 5) subscription.setActiva(false);
        subscriptions.save(subscription);
    }
    private boolean configured() { return enabled && !publicKey.isBlank() && !privateKey.isBlank(); }
    private String safeUrl(String value) {
        if (value == null || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
        return value.length() > 240 ? "/dashboard" : value;
    }
    private String clean(String value, int max) {
        String clean = value == null ? "" : value.replaceAll("[\\p{Cntrl}]", " ").trim();
        return clean.substring(0, Math.min(clean.length(), max));
    }
}
