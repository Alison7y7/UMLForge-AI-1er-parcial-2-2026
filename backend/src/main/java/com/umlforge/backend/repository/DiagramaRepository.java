package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Diagrama;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiagramaRepository extends JpaRepository<Diagrama, Long> {
    List<Diagrama> findByProyectoId(Long proyectoId);
}
