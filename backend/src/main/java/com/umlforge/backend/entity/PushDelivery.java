package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_delivery", uniqueConstraints = @UniqueConstraint(columnNames = {"event_key", "usuario_id", "subscription_id"}))
public class PushDelivery {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "event_key", nullable = false, length = 180) private String eventKey;
    @Column(name = "usuario_id", nullable = false) private Long usuarioId;
    @Column(name = "subscription_id", nullable = false) private Long subscriptionId;
    @Column(nullable = false) private Instant fechaEnvio = Instant.now();
    public PushDelivery() {}
    public PushDelivery(String eventKey, Long usuarioId, Long subscriptionId) {
        this.eventKey = eventKey; this.usuarioId = usuarioId; this.subscriptionId = subscriptionId;
    }
}
