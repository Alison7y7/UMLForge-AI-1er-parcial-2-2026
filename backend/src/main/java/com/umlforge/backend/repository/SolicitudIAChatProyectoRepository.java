package com.umlforge.backend.repository;

import com.umlforge.backend.entity.SolicitudIAChatProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SolicitudIAChatProyectoRepository extends JpaRepository<SolicitudIAChatProyecto, Long> {
    Optional<SolicitudIAChatProyecto> findByProyectoIdAndSolicitudId(Long proyectoId, String solicitudId);

    @Query(value = "select 1 from pg_advisory_xact_lock(cast(:proyectoId as bigint))", nativeQuery = true)
    Integer bloquearProyecto(@Param("proyectoId") Long proyectoId);
}
