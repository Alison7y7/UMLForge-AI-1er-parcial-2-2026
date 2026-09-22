package com.umlforge.backend.repository;

import com.umlforge.backend.entity.AnalisisImagen;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalisisImagenRepository extends JpaRepository<AnalisisImagen, Long> {
    List<AnalisisImagen> findByUsuarioId(Long usuarioId);
}
