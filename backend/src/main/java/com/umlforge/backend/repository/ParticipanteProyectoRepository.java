package com.umlforge.backend.repository;

import com.umlforge.backend.entity.ParticipanteProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipanteProyectoRepository extends JpaRepository<ParticipanteProyecto, Long> {
    List<ParticipanteProyecto> findByProyectoId(Long proyectoId);
    List<ParticipanteProyecto> findByUsuarioId(Long usuarioId);
    boolean existsByProyectoIdAndUsuarioId(Long proyectoId, Long usuarioId);
    void deleteByProyectoIdAndUsuarioId(Long proyectoId, Long usuarioId);
}
