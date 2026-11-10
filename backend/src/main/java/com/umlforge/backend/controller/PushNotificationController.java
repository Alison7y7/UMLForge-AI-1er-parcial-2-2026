package com.umlforge.backend.controller;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.service.PushNotificationEvent;
import com.umlforge.backend.service.PushNotificationService;
import com.umlforge.backend.service.PushSubscriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Set;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notificaciones/push")
public class PushNotificationController {
    private final PushSubscriptionService subscriptions;
    private final PushNotificationService notifications;

    @GetMapping("/configuracion")
    public PushSettingsResponse settings(Authentication auth) { return subscriptions.settings(auth.getName()); }
    @PostMapping("/suscripciones")
    public PushSettingsResponse subscribe(@Valid @RequestBody PushSubscriptionRequest request, Authentication auth) {
        return subscriptions.subscribe(request, auth.getName());
    }
    @DeleteMapping("/suscripciones")
    public ResponseEntity<Void> unsubscribe(@Valid @RequestBody PushUnsubscribeRequest request, Authentication auth) {
        subscriptions.unsubscribe(request, auth.getName()); return ResponseEntity.noContent().build();
    }
    @PutMapping("/preferencias")
    public PushSettingsResponse preferences(@RequestBody PushPreferencesRequest request, Authentication auth) {
        return subscriptions.updatePreferences(request, auth.getName());
    }
    @PostMapping("/prueba")
    public ResponseEntity<PushTestResponse> test(Authentication auth) {
        PushTestResponse response = notifications.sendTestNotification(auth.getName());
        return response.success() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/ack")
    public ResponseEntity<Void> ack(@RequestParam(required = false) String ackId) {
        notifications.confirmReceipt(ackId);
        return ResponseEntity.ok().build();
    }
}
