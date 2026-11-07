package com.umlforge.backend.repository;

import com.umlforge.backend.entity.RecomendacionAplicadaProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecomendacionAplicadaProyectoRepository extends JpaRepository<RecomendacionAplicadaProyecto, Long> {
    boolean existsByMensajeIaIdAndRecomendacionId(Long mensajeId, String recomendacionId);
}
