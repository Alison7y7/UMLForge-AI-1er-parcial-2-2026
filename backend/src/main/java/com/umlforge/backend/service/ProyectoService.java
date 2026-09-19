package com.umlforge.backend.service;

import com.umlforge.backend.dto.ProyectoRequest;
import com.umlforge.backend.dto.ProyectoResponse;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProyectoService {
    private final ProyectoRepository proyectoRepository;
    private final ParticipanteProyectoRepository participanteRepository;
    private final BitacoraService bitacoraService;

    public List<ProyectoResponse> listarProyectos(Usuario usuario) {
        boolean esAdmin = usuario.getPermisos() != null && usuario.getPermisos().stream().anyMatch(p -> p.getCodigo().equals("GESTIONAR_PROYECTOS"));
        if (!esAdmin && usuario.getRol() != null && usuario.getRol().getNombre().equals("ADMIN")) {
            esAdmin = true; // Fallback
        }
        
        List<Proyecto> proyectos;
        if (esAdmin) {
            proyectos = proyectoRepository.findAll();
        } else {
            proyectos = proyectoRepository.findByAnfitrionId(usuario.getId());
            List<Proyecto> partic = participanteRepository.findByUsuarioId(usuario.getId()).stream().map(p -> p.getProyecto()).collect(Collectors.toList());
            for (Proyecto p : partic) {
                if (!proyectos.contains(p)) proyectos.add(p);
            }
        }
        return proyectos.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public ProyectoResponse obtenerProyecto(Long id, Usuario usuario) {
        Proyecto proyecto = proyectoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
                
        boolean esAnfitrion = proyecto.getAnfitrion().getId().equals(usuario.getId());
        boolean esParticipante = participanteRepository.existsByProyectoIdAndUsuarioId(id, usuario.getId());
        
        if (!esAnfitrion && !esParticipante && (usuario.getRol() == null || !usuario.getRol().getNombre().equals("ADMIN"))) {
            throw new RuntimeException("No tiene permisos para ver este proyecto");
        }
        
        return mapToResponse(proyecto);
    }

    @Transactional
    public ProyectoResponse crearProyecto(ProyectoRequest request, Usuario actor) {
        Proyecto proyecto = new Proyecto();
        proyecto.setNombre(request.getNombre());
        proyecto.setDescripcion(request.getDescripcion());
        proyecto.setAnfitrion(actor);
        proyecto.setActivo(request.getActivo() != null ? request.getActivo() : true);
        proyecto.setFechaCreacion(LocalDateTime.now());
        proyecto.setFechaActualizacion(LocalDateTime.now());
        
        Proyecto guardado = proyectoRepository.save(proyecto);
        bitacoraService.registrarAccion(actor, guardado, "CREAR_PROYECTO", "Creó el proyecto " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    @Transactional
    public ProyectoResponse modificarProyecto(Long id, ProyectoRequest request, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(id).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        
        if (!proyecto.getAnfitrion().getId().equals(actor.getId()) && (actor.getRol() == null || !actor.getRol().getNombre().equals("ADMIN"))) {
            throw new RuntimeException("Solo el anfitrión puede modificar el proyecto");
        }
        
        proyecto.setNombre(request.getNombre());
        proyecto.setDescripcion(request.getDescripcion());
        if (request.getActivo() != null) {
            proyecto.setActivo(request.getActivo());
        }
        proyecto.setFechaActualizacion(LocalDateTime.now());
        
        Proyecto guardado = proyectoRepository.save(proyecto);
        bitacoraService.registrarAccion(actor, guardado, "MODIFICAR_PROYECTO", "Modificó el proyecto " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    @Transactional
    public ProyectoResponse cambiarEstadoProyecto(Long id, boolean activo, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(id).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        
        if (!proyecto.getAnfitrion().getId().equals(actor.getId()) && (actor.getRol() == null || !actor.getRol().getNombre().equals("ADMIN"))) {
            throw new RuntimeException("Solo el anfitrión puede modificar el estado del proyecto");
        }
        
        proyecto.setActivo(activo);
        proyecto.setFechaActualizacion(LocalDateTime.now());
        
        Proyecto guardado = proyectoRepository.save(proyecto);
        bitacoraService.registrarAccion(actor, guardado, "CAMBIAR_ESTADO_PROYECTO", (activo ? "Activó" : "Desactivó") + " el proyecto " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    private ProyectoResponse mapToResponse(Proyecto p) {
        ProyectoResponse res = new ProyectoResponse();
        res.setId(p.getId());
        res.setNombre(p.getNombre());
        res.setDescripcion(p.getDescripcion());
        res.setAnfitrionNombre(p.getAnfitrion() != null ? p.getAnfitrion().getNombre() + " " + p.getAnfitrion().getApellido() : null);
        res.setAnfitrionId(p.getAnfitrion() != null ? p.getAnfitrion().getId() : null);
        res.setActivo(p.getActivo());
        res.setFechaCreacion(p.getFechaCreacion());
        return res;
    }
}
