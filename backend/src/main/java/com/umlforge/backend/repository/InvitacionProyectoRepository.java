package com.umlforge.backend.repository;

import com.umlforge.backend.entity.InvitacionProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface InvitacionProyectoRepository extends JpaRepository<InvitacionProyecto, Long> {
    Optional<InvitacionProyecto> findByToken(String token);
    boolean existsByProyectoIdAndUsuarioInvitadoIdAndEstado(Long proyectoId, Long usuarioInvitadoId, com.umlforge.backend.entity.InvitacionEstado estado);
}
