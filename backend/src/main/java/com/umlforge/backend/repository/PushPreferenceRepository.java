package com.umlforge.backend.repository;

import com.umlforge.backend.entity.PushPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PushPreferenceRepository extends JpaRepository<PushPreference, Long> {
    Optional<PushPreference> findByUsuarioId(Long usuarioId);
}
