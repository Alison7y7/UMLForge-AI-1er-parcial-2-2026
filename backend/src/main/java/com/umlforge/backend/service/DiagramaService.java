package com.umlforge.backend.service;

import com.umlforge.backend.dto.DiagramaNombreRequest;
import com.umlforge.backend.dto.DiagramaRequest;
import com.umlforge.backend.dto.DiagramaResponse;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DiagramaService {

    private final DiagramaRepository diagramaRepository;
    private final ProyectoRepository proyectoRepository;
    private final ParticipanteProyectoRepository participanteRepository;
    private final BitacoraService bitacoraService;

    private void validarAccesoProyecto(Proyecto proyecto, Usuario actor) {
        boolean esAnfitrion = proyecto.getAnfitrion().getId().equals(actor.getId());
        boolean esAdmin = actor.getRol() != null && actor.getRol().getNombre().equals("ADMIN");
        boolean esParticipante = participanteRepository.existsByProyectoIdAndUsuarioId(proyecto.getId(), actor.getId());

        if (!esAnfitrion && !esAdmin && !esParticipante) {
            throw new RuntimeException("No tiene permisos para acceder a los diagramas de este proyecto");
        }
    }

    public List<DiagramaResponse> listarDiagramas(Long proyectoId, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        validarAccesoProyecto(proyecto, actor);

        return diagramaRepository.findByProyectoId(proyectoId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DiagramaResponse obtenerDiagrama(Long id, Usuario actor) {
        Diagrama diagrama = diagramaRepository.findById(id).orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        validarAccesoProyecto(diagrama.getProyecto(), actor);

        return mapToResponse(diagrama);
    }

    @Transactional
    public DiagramaResponse crearDiagrama(Long proyectoId, DiagramaRequest request, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        validarAccesoProyecto(proyecto, actor);

        Diagrama diagrama = new Diagrama();
        diagrama.setNombre(request.getNombre());
        diagrama.setProyecto(proyecto);
        diagrama.setModeloJson(request.getModeloJson());

        Diagrama guardado = diagramaRepository.save(diagrama);
        bitacoraService.registrarAccion(actor, proyecto, "CREAR_DIAGRAMA", "Creó el diagrama: " + guardado.getNombre());

        return mapToResponse(guardado);
    }

    @Transactional
    public DiagramaResponse modificarDiagrama(Long id, DiagramaRequest request, Usuario actor) {
        Diagrama diagrama = diagramaRepository.findById(id).orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        validarAccesoProyecto(diagrama.getProyecto(), actor);

        diagrama.setNombre(request.getNombre());
        diagrama.setModeloJson(request.getModeloJson());

        Diagrama guardado = diagramaRepository.save(diagrama);
        bitacoraService.registrarAccion(actor, diagrama.getProyecto(), "MODIFICAR_DIAGRAMA", "Modificó el diagrama: " + guardado.getNombre());

        return mapToResponse(guardado);
    }

    @Transactional
    public DiagramaResponse cambiarNombre(Long id, String nombre, Usuario actor) {
        Diagrama diagrama = diagramaRepository.findById(id).orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        validarAccesoProyecto(diagrama.getProyecto(), actor);

        diagrama.setNombre(nombre);

        Diagrama guardado = diagramaRepository.save(diagrama);
        bitacoraService.registrarAccion(actor, diagrama.getProyecto(), "CAMBIAR_NOMBRE_DIAGRAMA", "Cambió el nombre del diagrama a: " + guardado.getNombre());

        return mapToResponse(guardado);
    }

    @Transactional
    public DiagramaResponse cambiarEstado(Long id, boolean activo, Usuario actor) {
        Diagrama diagrama = diagramaRepository.findById(id).orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        
        Proyecto proyecto = diagrama.getProyecto();
        boolean esAnfitrion = proyecto.getAnfitrion().getId().equals(actor.getId());
        boolean esAdmin = actor.getPermisos() != null && actor.getPermisos().stream().anyMatch(p -> p.getCodigo().equals("GESTIONAR_PROYECTOS"));
        if (!esAdmin && actor.getRol() != null && actor.getRol().getNombre().equals("ADMIN")) esAdmin = true;
        
        if (!esAnfitrion && !esAdmin) {
            throw new RuntimeException("Solo el anfitrión puede modificar el estado del diagrama");
        }

        diagrama.setActivo(activo);
        Diagrama guardado = diagramaRepository.save(diagrama);
        bitacoraService.registrarAccion(actor, proyecto, "CAMBIAR_ESTADO_DIAGRAMA", (activo ? "Activó" : "Desactivó") + " el diagrama " + guardado.getNombre());

        return mapToResponse(guardado);
    }

    private DiagramaResponse mapToResponse(Diagrama d) {
        DiagramaResponse res = new DiagramaResponse();
        res.setId(d.getId());
        res.setNombre(d.getNombre());
        res.setProyectoId(d.getProyecto().getId());
        res.setModeloJson(d.getModeloJson());
        res.setVersion(d.getVersion());
        res.setFechaCreacion(d.getFechaCreacion());
        res.setFechaActualizacion(d.getFechaActualizacion());
        res.setActivo(d.getActivo() != null ? d.getActivo() : true);
        return res;
    }
}
