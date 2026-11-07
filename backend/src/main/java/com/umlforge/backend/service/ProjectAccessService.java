package com.umlforge.backend.service;

import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class ProjectAccessService {

    private final ProyectoRepository proyectoRepository;
    private final DiagramaRepository diagramaRepository;
    private final ParticipanteProyectoRepository participanteRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public Usuario requireUser(String correo) {
        return usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new AccessDeniedException("Usuario autenticado no encontrado"));
    }

    @Transactional(readOnly = true)
    public Proyecto requireProjectAccess(Long proyectoId, String correo) {
        return requireProjectAccess(proyectoId, requireUser(correo));
    }

    @Transactional(readOnly = true)
    public Proyecto requireProjectAccess(Long proyectoId, Usuario usuario) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Proyecto no encontrado"));
        if (!canAccess(proyecto, usuario)) {
            throw new AccessDeniedException("No tiene acceso a este proyecto");
        }
        return proyecto;
    }

    @Transactional(readOnly = true)
    public Diagrama requireDiagramAccess(Long diagramaId, String correo) {
        Usuario usuario = requireUser(correo);
        Diagrama diagrama = diagramaRepository.findById(diagramaId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Diagrama no encontrado"));
        if (!canAccess(diagrama.getProyecto(), usuario)) {
            throw new AccessDeniedException("No tiene acceso a este diagrama");
        }
        return diagrama;
    }

    private boolean canAccess(Proyecto proyecto, Usuario usuario) {
        boolean esAnfitrion = proyecto.getAnfitrion() != null
                && proyecto.getAnfitrion().getId().equals(usuario.getId());
        // GESTIONAR_PROYECTOS is scoped to projects owned by an ANFITRION. It must
        // not turn that role into a system administrator with cross-project access.
        boolean esAdmin = usuario.getRol() != null && "ADMIN".equals(usuario.getRol().getNombre());
        boolean esParticipanteActivo = participanteRepository
                .existsByProyectoIdAndUsuarioIdAndActivoTrue(proyecto.getId(), usuario.getId());
        return esAnfitrion || esAdmin || esParticipanteActivo;
    }
}
