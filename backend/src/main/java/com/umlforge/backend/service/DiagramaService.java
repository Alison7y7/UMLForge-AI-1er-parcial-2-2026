package com.umlforge.backend.service;

import com.umlforge.backend.dto.DiagramaNombreRequest;
import com.umlforge.backend.dto.DiagramaRequest;
import com.umlforge.backend.dto.DiagramaResponse;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.CONFLICT;

@Service
@RequiredArgsConstructor
public class DiagramaService {

    private final DiagramaRepository diagramaRepository;
    private final ProyectoRepository proyectoRepository;
    private final BitacoraService bitacoraService;
    private final ProjectAccessService projectAccessService;

    private void validarAccesoProyecto(Proyecto proyecto, Usuario actor) {
        projectAccessService.requireProjectAccess(proyecto.getId(), actor);
    }

    public List<DiagramaResponse> listarDiagramas(Long proyectoId, Usuario actor) {
        Proyecto proyecto = proyectoRepository.findById(proyectoId).orElseThrow(() -> new RuntimeException("Proyecto no encontrado"));
        validarAccesoProyecto(proyecto, actor);

        return diagramaRepository.findByProyectoId(proyectoId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DiagramaResponse obtenerDiagrama(Long id, Usuario actor) {
        Diagrama diagrama = obtenerEntidadConAcceso(id, actor);

        return mapToResponse(diagrama);
    }

    public Diagrama obtenerEntidadConAcceso(Long id, Usuario actor) {
        Diagrama diagrama = diagramaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        validarAccesoProyecto(diagrama.getProyecto(), actor);
        return diagrama;
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
        Diagrama diagrama = diagramaRepository.findByIdForUpdate(id).orElseThrow(() -> new RuntimeException("Diagrama no encontrado"));
        validarAccesoProyecto(diagrama.getProyecto(), actor);

        if (request.getVersion() != null && !request.getVersion().equals(diagrama.getVersion())) {
            throw new ResponseStatusException(CONFLICT,
                    "El diagrama cambio en otra sesion. Recarga o resuelve tus cambios locales antes de guardar");
        }

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
        boolean esAdmin = actor.getRol() != null && actor.getRol().getNombre().equals("ADMIN");
        
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
