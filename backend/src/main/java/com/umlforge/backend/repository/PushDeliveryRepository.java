package com.umlforge.backend.repository;

import com.umlforge.backend.entity.PushDelivery;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PushDeliveryRepository extends JpaRepository<PushDelivery, Long> {
    boolean existsByEventKeyAndUsuarioIdAndSubscriptionId(String eventKey, Long usuarioId, Long subscriptionId);
}
