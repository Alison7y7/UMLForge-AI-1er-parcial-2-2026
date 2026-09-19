package com.umlforge.backend.repository;

import com.umlforge.backend.entity.InvitacionProyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InvitacionProyectoRepository extends JpaRepository<InvitacionProyecto, Long> {
    Optional<InvitacionProyecto> findByToken(String token);
    boolean existsByProyectoIdAndUsuarioInvitadoIdAndEstado(Long proyectoId, Long usuarioInvitadoId, com.umlforge.backend.entity.InvitacionEstado estado);
    List<InvitacionProyecto> findByUsuarioInvitadoIdAndEstado(Long usuarioInvitadoId, com.umlforge.backend.entity.InvitacionEstado estado);
    List<InvitacionProyecto> findByProyectoIdAndEstado(Long proyectoId, com.umlforge.backend.entity.InvitacionEstado estado);
}
