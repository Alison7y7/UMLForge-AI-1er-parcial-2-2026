package com.umlforge.backend.service;

import com.umlforge.backend.dto.ParticipanteRequest;
import com.umlforge.backend.dto.ParticipanteResponse;
import com.umlforge.backend.entity.ParticipanteProyecto;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParticipanteProyectoService {
    private final ParticipanteProyectoRepository participanteRepository;
    private final ProyectoRepository proyectoRepository;
    private final UsuarioRepository usuarioRepository;
    private final BitacoraService bitacoraService;

    public List<ParticipanteResponse> listarParticipantes(Long proyectoId, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        // Opcional: Validar si actor tiene permisos para ver
        return participanteRepository.findByProyectoId(proyectoId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ParticipanteResponse agregarParticipante(Long proyectoId, ParticipanteRequest request, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        
        if (!proyecto.getAnfitrion().getId().equals(actor.getId()) && (actor.getRol() == null || !actor.getRol().getNombre().equals("ADMIN"))) {
            throw new RuntimeException("Solo el anfitrión puede agregar participantes");
        }

        Usuario nuevoParticipante = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new RuntimeException("Usuario a invitar no encontrado"));

        if (nuevoParticipante.getId().equals(proyecto.getAnfitrion().getId())) {
            throw new RuntimeException("El anfitrión no puede agregarse como participante");
        }

        if (participanteRepository.existsByProyectoIdAndUsuarioId(proyectoId, nuevoParticipante.getId())) {
            throw new RuntimeException("El usuario ya es participante del proyecto");
        }

        ParticipanteProyecto participante = new ParticipanteProyecto();
        participante.setProyecto(proyecto);
        participante.setUsuario(nuevoParticipante);
        participante.setActivo(true);
        participante.setFechaIngreso(LocalDateTime.now());
        
        ParticipanteProyecto guardado = participanteRepository.save(participante);
        bitacoraService.registrarAccion(actor, proyecto, "AGREGAR_PARTICIPANTE", "Agregó a " + nuevoParticipante.getCorreo() + " al proyecto");
        return mapToResponse(guardado);
    }

    @Transactional
    public void quitarParticipante(Long proyectoId, Long usuarioId, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        
        if (!proyecto.getAnfitrion().getId().equals(actor.getId()) && (actor.getRol() == null || !actor.getRol().getNombre().equals("ADMIN"))) {
            throw new RuntimeException("Solo el anfitrión puede quitar participantes");
        }
        
        if (!participanteRepository.existsByProyectoIdAndUsuarioId(proyectoId, usuarioId)) {
            throw new RuntimeException("El participante no existe en el proyecto");
        }
        
        participanteRepository.deleteByProyectoIdAndUsuarioId(proyectoId, usuarioId);
        bitacoraService.registrarAccion(actor, proyecto, "QUITAR_PARTICIPANTE", "Quitó al usuario con ID " + usuarioId + " del proyecto");
    }

    private ParticipanteResponse mapToResponse(ParticipanteProyecto p) {
        ParticipanteResponse res = new ParticipanteResponse();
        res.setId(p.getId());
        res.setUsuarioId(p.getUsuario() != null ? p.getUsuario().getId() : null);
        res.setNombreUsuario(p.getUsuario() != null ? p.getUsuario().getNombre() + " " + p.getUsuario().getApellido() : null);
        res.setCorreo(p.getUsuario() != null ? p.getUsuario().getCorreo() : null);
        res.setFechaIngreso(p.getFechaIngreso());
        return res;
    }
}
