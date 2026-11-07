package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Diagrama;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.Optional;

import java.util.List;

@Repository
public interface DiagramaRepository extends JpaRepository<Diagrama, Long> {
    List<Diagrama> findByProyectoId(Long proyectoId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Diagrama d where d.id = :id")
    Optional<Diagrama> findByIdForUpdate(@Param("id") Long id);
}
