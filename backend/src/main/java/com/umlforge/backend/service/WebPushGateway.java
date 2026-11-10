package com.umlforge.backend.service;

import com.umlforge.backend.entity.PushSubscription;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Encoding;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Urgency;
import nl.martijndwars.webpush.Utils;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Security;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebPushGateway {
    @Value("${push.vapid.public-key:}") private String publicKey;
    @Value("${push.vapid.private-key:}") private String privateKey;
    @Value("${push.vapid.subject:mailto:admin@18.214.98.32.sslip.io}") private String subject;

    @PostConstruct
    public void init() {
        registerBouncyCastle();
    }

    private synchronized void registerBouncyCastle() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
            log.info("BouncyCastleProvider registrado exitosamente para Web Push");
        }
    }

    public int send(PushSubscription subscription, String payload) throws Exception {
        registerBouncyCastle();
        PushService service = new PushService();
        service.setPublicKey(Utils.loadPublicKey(publicKey));
        service.setPrivateKey(Utils.loadPrivateKey(privateKey));
        service.setSubject(subject);

        Notification notification = new Notification.NotificationBuilder()
                .endpoint(subscription.getEndpoint())
                .userPublicKey(subscription.getP256dh())
                .userAuth(subscription.getAuth())
                .payload(payload)
                .ttl(86400)
                .urgency(Urgency.HIGH)
                .build();
        var response = service.send(notification, Encoding.AES128GCM);
        int statusCode = response.getStatusLine().getStatusCode();
        String responseBody = "";
        try {
            if (response.getEntity() != null) {
                responseBody = org.apache.http.util.EntityUtils.toString(response.getEntity());
            }
        } catch (Exception ignored) {}
        log.info("WebPush enviado con AES128GCM y Urgency.HIGH. Status={} para subId={}, respuesta={}", statusCode, subscription.getId(), responseBody);
        return statusCode;
    }
}
