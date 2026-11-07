package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Bitacora;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import org.springframework.data.domain.Pageable;

@Repository
public interface BitacoraRepository extends JpaRepository<Bitacora, Long> {
    List<Bitacora> findByProyectoAnfitrionIdOrderByFechaHoraDesc(Long anfitrionId);
    List<Bitacora> findAllByOrderByFechaHoraDesc();
    List<Bitacora> findByProyectoIdOrderByFechaHoraDesc(Long proyectoId, Pageable pageable);
}
