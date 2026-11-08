package com.umlforge.backend.repository;

import com.umlforge.backend.entity.MensajeChatProyecto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;

public interface MensajeChatProyectoRepository extends JpaRepository<MensajeChatProyecto, Long> {
    Page<MensajeChatProyecto> findByProyectoId(Long proyectoId, Pageable pageable);
    @EntityGraph(attributePaths = {"usuarioEmisor", "adjuntos"})
    List<MensajeChatProyecto> findByProyectoIdOrderByFechaHoraDescIdDesc(Long proyectoId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from MensajeChatProyecto m where m.id = :id")
    Optional<MensajeChatProyecto> findByIdForUpdate(@Param("id") Long id);
}
