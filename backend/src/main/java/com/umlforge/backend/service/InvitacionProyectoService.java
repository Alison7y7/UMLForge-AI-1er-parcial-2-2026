package com.umlforge.backend.service;

import com.umlforge.backend.dto.InvitacionCrearRequest;
import com.umlforge.backend.dto.InvitacionResponse;
import com.umlforge.backend.entity.InvitacionEstado;
import com.umlforge.backend.entity.InvitacionProyecto;
import com.umlforge.backend.entity.ParticipanteProyecto;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.InvitacionProyectoRepository;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvitacionProyectoService {

    private final InvitacionProyectoRepository invitacionRepository;
    private final ParticipanteProyectoRepository participanteRepository;
    private final ProyectoRepository proyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;

    /**
     * Crea una nueva invitación para un usuario a un proyecto.
     * Se valida que el email exista, que no sea el anfitrión, que no sea ya participante y que no exista una invitación pendiente.
     */
    @Transactional
    public InvitacionResponse crearInvitacion(Long proyectoId, InvitacionCrearRequest request, Usuario anfitrion) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId)
                .orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        // Solo el anfitrión del proyecto (o ADMIN) puede crear invitaciones
        if (!proyecto.getAnfitrion().getId().equals(anfitrion.getId())) {
            throw new RuntimeException("Solo el anfitrión puede crear invitaciones");
        }
        Usuario invitado = usuarioRepository.findByCorreo(request.getEmailInvitado())
                .orElseThrow(() -> new RuntimeException("Usuario a invitar no encontrado"));
        // No invitar al propio anfitrión
        if (invitado.getId().equals(anfitrion.getId())) {
            throw new RuntimeException("El anfitrión no puede invitarse a sí mismo");
        }
        // Verificar que ya sea participante
        boolean yaParticipa = proyecto.getParticipantes() != null && proyecto.getParticipantes().stream()
                .anyMatch(p -> p.getUsuario().getId().equals(invitado.getId()));
        if (yaParticipa) {
            throw new RuntimeException("Este usuario ya participa en el proyecto");
        }
        // Verificar invitación pendiente
        boolean pendiente = invitacionRepository.existsByProyectoIdAndUsuarioInvitadoIdAndEstado(
                proyectoId, invitado.getId(), InvitacionEstado.PENDIENTE);
        if (pendiente) {
            throw new RuntimeException("Ya existe una invitación pendiente para este usuario");
        }
        // Crear token único
        String token = UUID.randomUUID().toString();
        InvitacionProyecto inv = new InvitacionProyecto();
        inv.setProyecto(proyecto);
        inv.setAnfitrion(anfitrion);
        inv.setUsuarioInvitado(invitado);
        inv.setToken(token);
        inv.setEstado(InvitacionEstado.PENDIENTE);
        inv.setFechaCreacion(LocalDateTime.now());
        // Opcional expiración 7 días
        inv.setFechaExpiracion(LocalDateTime.now().plusDays(7));
        InvitacionProyecto guardada = invitacionRepository.save(inv);
        // Registro en bitácora
        bitacoraService.registrarAccion(anfitrion, proyecto, "INVITAR_PARTICIPANTE",
                "Invitó a " + invitado.getCorreo());
        // Mapear a DTO
        InvitacionResponse resp = new InvitacionResponse();
        resp.setId(guardada.getId());
        resp.setProyectoId(proyecto.getId());
        resp.setAnfitrionNombre(anfitrion.getNombre() + " " + anfitrion.getApellido());
        resp.setEmailInvitado(invitado.getCorreo());
        resp.setToken(token);
        resp.setEstado(guardada.getEstado().name());
        resp.setFechaCreacion(guardada.getFechaCreacion());
        resp.setFechaExpiracion(guardada.getFechaExpiracion());
        return resp;
    }

    public Optional<InvitacionProyecto> obtenerPorToken(String token) {
        return invitacionRepository.findByToken(token);
    }

    @Transactional
    public InvitacionResponse aceptarInvitacion(String token, Usuario invitado) {
        InvitacionProyecto inv = invitacionRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invitación no válida"));
        if (inv.getEstado() != InvitacionEstado.PENDIENTE) {
            throw new RuntimeException("Esta invitación ya fue utilizada");
        }
        if (!inv.getUsuarioInvitado().getId().equals(invitado.getId())) {
            throw new RuntimeException("Este usuario no está autorizado para aceptar la invitación");
        }
        // Crear registro de participante
        ParticipanteProyecto participante = new ParticipanteProyecto();
        participante.setProyecto(inv.getProyecto());
        participante.setUsuario(invitado);
        participante.setActivo(true);
        participante.setFechaIngreso(LocalDateTime.now());
        participanteRepository.save(participante);
        // Cambiamos estado
        inv.setEstado(InvitacionEstado.ACEPTADA);
        invitacionRepository.save(inv);
        // Bitácora
        bitacoraService.registrarAccion(invitado, inv.getProyecto(), "ACEPTAR_INVITACION",
                "Aceptó la invitación al proyecto");
        // Mapear respuesta
        InvitacionResponse resp = new InvitacionResponse();
        resp.setId(inv.getId());
        resp.setProyectoId(inv.getProyecto().getId());
        resp.setAnfitrionNombre(inv.getAnfitrion().getNombre() + " " + inv.getAnfitrion().getApellido());
        resp.setEmailInvitado(invitado.getCorreo());
        resp.setToken(inv.getToken());
        resp.setEstado(inv.getEstado().name());
        resp.setFechaCreacion(inv.getFechaCreacion());
        resp.setFechaExpiracion(inv.getFechaExpiracion());
        return resp;
    }

    @Transactional
    public InvitacionResponse rechazarInvitacion(String token, Usuario invitado) {
        InvitacionProyecto inv = invitacionRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Invitación no válida"));
        if (inv.getEstado() != InvitacionEstado.PENDIENTE) {
            throw new RuntimeException("Esta invitación ya fue utilizada");
        }
        if (!inv.getUsuarioInvitado().getId().equals(invitado.getId())) {
            throw new RuntimeException("Este usuario no está autorizado para rechazar la invitación");
        }
        inv.setEstado(InvitacionEstado.RECHAZADA);
        invitacionRepository.save(inv);
        bitacoraService.registrarAccion(invitado, inv.getProyecto(), "RECHAZAR_INVITACION",
                "Rechazó la invitación al proyecto");
        InvitacionResponse resp = new InvitacionResponse();
        resp.setId(inv.getId());
        resp.setProyectoId(inv.getProyecto().getId());
        resp.setAnfitrionNombre(inv.getAnfitrion().getNombre() + " " + inv.getAnfitrion().getApellido());
        resp.setEmailInvitado(invitado.getCorreo());
        resp.setToken(inv.getToken());
        resp.setEstado(inv.getEstado().name());
        resp.setFechaCreacion(inv.getFechaCreacion());
        resp.setFechaExpiracion(inv.getFechaExpiracion());
        return resp;
    }
}
