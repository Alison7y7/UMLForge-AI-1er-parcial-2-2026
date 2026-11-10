package com.umlforge.backend.service;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import java.net.URI;

@Service
@RequiredArgsConstructor
public class PushSubscriptionService {
    private final PushSubscriptionRepository subscriptions;
    private final PushPreferenceRepository preferences;
    private final ProjectAccessService access;
    @Value("${push.vapid.public-key:}") private String publicKey;
    @Value("${push.vapid.private-key:}") private String privateKey;
    @Value("${push.enabled:true}") private boolean enabled;

    @Transactional(readOnly = true)
    public PushSettingsResponse settings(String email) {
        Usuario user = access.requireUser(email);
        PushPreference pref = preferences.findByUsuarioId(user.getId()).orElseGet(PushPreference::new);
        return response(user, pref);
    }

    @Transactional
    public PushSettingsResponse subscribe(PushSubscriptionRequest request, String email) {
        Usuario user = access.requireUser(email);
        validate(request);
        PushSubscription subscription = subscriptions.findByEndpoint(request.endpoint()).orElseGet(PushSubscription::new);
        if (subscription.getId() != null && !subscription.getUsuario().getId().equals(user.getId())) {
            throw new AccessDeniedException("La suscripción pertenece a otro usuario");
        }
        subscription.setUsuario(user);
        subscription.setEndpoint(request.endpoint());
        subscription.setP256dh(request.p256dh());
        subscription.setAuth(request.auth());
        subscription.setDispositivo(trim(request.dispositivo(), 120));
        subscription.setActiva(true);
        subscription.setFallosConsecutivos(0);
        subscriptions.save(subscription);
        PushPreference pref = getOrCreate(user);
        return response(user, pref);
    }

    @Transactional
    public void unsubscribe(PushUnsubscribeRequest request, String email) {
        Usuario user = access.requireUser(email);
        subscriptions.deleteByEndpointAndUsuarioId(request.endpoint(), user.getId());
    }

    @Transactional
    public PushSettingsResponse updatePreferences(PushPreferencesRequest request, String email) {
        Usuario user = access.requireUser(email);
        PushPreference pref = getOrCreate(user);
        pref.setInvitaciones(request.invitaciones());
        pref.setMenciones(request.menciones());
        pref.setRecomendaciones(request.recomendaciones());
        pref.setCambiosUml(request.cambiosUml());
        preferences.save(pref);
        return response(user, pref);
    }

    private PushPreference getOrCreate(Usuario user) {
        return preferences.findByUsuarioId(user.getId()).orElseGet(() -> {
            PushPreference value = new PushPreference(); value.setUsuario(user); return preferences.save(value);
        });
    }
    private PushSettingsResponse response(Usuario user, PushPreference pref) {
        boolean configured = enabled && !publicKey.isBlank() && !privateKey.isBlank();
        return new PushSettingsResponse(configured, configured ? publicKey : "",
                subscriptions.existsByUsuarioIdAndActivaTrue(user.getId()),
                pref.isInvitaciones(), pref.isMenciones(), pref.isRecomendaciones(), pref.isCambiosUml());
    }
    private void validate(PushSubscriptionRequest request) {
        try {
            URI uri = URI.create(request.endpoint());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || request.endpoint().length() > 2048)
                throw new IllegalArgumentException();
            String host = uri.getHost().toLowerCase(java.util.Locale.ROOT);
            if (host.equals("localhost") || host.endsWith(".local") || host.endsWith(".internal")
                    || host.contains(":") || host.matches("[0-9.]+")) throw new IllegalArgumentException();
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Endpoint push inválido");
        }
        if (request.p256dh().length() > 256 || request.auth().length() > 128)
            throw new ResponseStatusException(BAD_REQUEST, "Claves de suscripción inválidas");
    }
    private String trim(String value, int max) {
        if (value == null) return null;
        String clean = value.replaceAll("[\\p{Cntrl}]", " ").trim();
        return clean.substring(0, Math.min(clean.length(), max));
    }
}
