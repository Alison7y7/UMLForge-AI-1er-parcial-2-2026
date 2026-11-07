package com.umlforge.backend.repository;

import com.umlforge.backend.entity.MensajeChatProyecto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MensajeChatProyectoRepository extends JpaRepository<MensajeChatProyecto, Long> {
    Page<MensajeChatProyecto> findByProyectoId(Long proyectoId, Pageable pageable);
    List<MensajeChatProyecto> findByProyectoIdOrderByFechaHoraDescIdDesc(Long proyectoId, Pageable pageable);
}
