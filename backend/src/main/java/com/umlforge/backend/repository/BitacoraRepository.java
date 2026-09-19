package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Bitacora;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BitacoraRepository extends JpaRepository<Bitacora, Long> {
    List<Bitacora> findByProyectoAnfitrionIdOrderByFechaHoraDesc(Long anfitrionId);
    List<Bitacora> findAllByOrderByFechaHoraDesc();
}
