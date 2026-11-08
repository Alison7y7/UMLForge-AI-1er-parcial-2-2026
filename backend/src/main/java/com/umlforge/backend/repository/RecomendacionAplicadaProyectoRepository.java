package com.umlforge.backend.repository;

import com.umlforge.backend.entity.RecomendacionAplicadaProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;

public interface RecomendacionAplicadaProyectoRepository extends JpaRepository<RecomendacionAplicadaProyecto, Long> {
    boolean existsByMensajeIaIdAndRecomendacionId(Long mensajeId, String recomendacionId);
    @EntityGraph(attributePaths = {"mensajeIa", "diagrama", "aplicadaPor"})
    List<RecomendacionAplicadaProyecto> findByProyectoId(Long proyectoId);
}
