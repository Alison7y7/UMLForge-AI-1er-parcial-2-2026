package com.umlforge.backend.repository;

import com.umlforge.backend.entity.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {
    Optional<PushSubscription> findByEndpoint(String endpoint);
    List<PushSubscription> findByUsuarioIdAndActivaTrue(Long usuarioId);
    boolean existsByUsuarioIdAndActivaTrue(Long usuarioId);
    long deleteByEndpointAndUsuarioId(String endpoint, Long usuarioId);
}
