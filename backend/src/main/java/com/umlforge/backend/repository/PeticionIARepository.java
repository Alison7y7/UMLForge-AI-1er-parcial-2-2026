package com.umlforge.backend.repository;

import com.umlforge.backend.entity.PeticionIA;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PeticionIARepository extends JpaRepository<PeticionIA, Long> {
    List<PeticionIA> findByUsuarioId(Long usuarioId);
}
