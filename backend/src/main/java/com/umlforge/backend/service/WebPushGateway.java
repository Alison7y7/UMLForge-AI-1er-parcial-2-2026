package com.umlforge.backend.service;

import com.umlforge.backend.entity.PushSubscription;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebPushGateway {
    @Value("${push.vapid.public-key:}") private String publicKey;
    @Value("${push.vapid.private-key:}") private String privateKey;
    @Value("${push.vapid.subject:mailto:admin@localhost}") private String subject;

    public int send(PushSubscription subscription, String payload) throws Exception {
        PushService service = new PushService(publicKey, privateKey, subject);
        return service.send(new Notification(subscription.getEndpoint(), subscription.getP256dh(),
                subscription.getAuth(), payload)).getStatusLine().getStatusCode();
    }
}
