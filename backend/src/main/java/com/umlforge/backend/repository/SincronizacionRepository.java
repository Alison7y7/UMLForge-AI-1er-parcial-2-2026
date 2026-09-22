package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Sincronizacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SincronizacionRepository extends JpaRepository<Sincronizacion, Long> {
    List<Sincronizacion> findByDiagramaId(Long diagramaId);
}
