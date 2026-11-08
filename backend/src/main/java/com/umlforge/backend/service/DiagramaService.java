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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.CONFLICT;

@Service
@RequiredArgsConstructor
public class DiagramaService {

    private final DiagramaRepository diagramaRepository;
    private final ProyectoRepository proyectoRepository;
    private final BitacoraService bitacoraService;
    private final ProjectAccessService projectAccessService;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

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
        requireEditPermission(actor);

        if (request.getVersion() != null && !request.getVersion().equals(diagrama.getVersion())) {
            throw new ResponseStatusException(CONFLICT,
                    "El diagrama cambio en otra sesion. Recarga o resuelve tus cambios locales antes de guardar");
        }

        String previousModel = diagrama.getModeloJson();
        Long previousVersion = diagrama.getVersion();
        diagrama.setNombre(request.getNombre());
        diagrama.setModeloJson(request.getModeloJson());

        // @Version must be incremented before building the REST response and the
        // authoritative event that will be delivered after this transaction commits.
        Diagrama guardado = diagramaRepository.saveAndFlush(diagrama);
        bitacoraService.registrarAccion(actor, diagrama.getProyecto(), "MODIFICAR_DIAGRAMA", "Modificó el diagrama: " + guardado.getNombre());
        registrarEliminaciones(actor, guardado, previousModel, request.getModeloJson(),
                previousVersion, guardado.getVersion());

        String changeId = request.getChangeId() == null || request.getChangeId().isBlank()
                ? "manual:" + UUID.randomUUID()
                : request.getChangeId();
        eventPublisher.publishEvent(new DiagramaActualizadoEvent(
                guardado.getProyecto().getId(), guardado.getId(), actor.getId(), fullName(actor),
                changeId, "MANUAL", guardado.getNombre(), guardado.getVersion(), guardado.getModeloJson()));

        return mapToResponse(guardado);
    }

    private void registrarEliminaciones(Usuario actor, Diagrama diagram, String beforeJson,
            String afterJson, Long beforeVersion, Long afterVersion) {
        try {
            JsonNode before = objectMapper.readTree(beforeJson == null || beforeJson.isBlank()
                    ? "{\"clases\":[],\"relaciones\":[]}" : beforeJson);
            JsonNode after = objectMapper.readTree(afterJson == null || afterJson.isBlank()
                    ? "{\"clases\":[],\"relaciones\":[]}" : afterJson);
            Set<String> currentClasses = new java.util.HashSet<>();
            after.path("clases").forEach(item -> currentClasses.add(item.path("id").asText()));
            Set<String> currentRelations = new java.util.HashSet<>();
            after.path("relaciones").forEach(item -> currentRelations.add(item.path("id").asText()));
            for (JsonNode umlClass : before.path("clases")) {
                String classId = umlClass.path("id").asText();
                if (classId.isBlank() || currentClasses.contains(classId)) continue;
                long dependent = 0;
                for (JsonNode relation : before.path("relaciones")) {
                    if (classId.equals(relation.path("origen").asText())
                            || classId.equals(relation.path("destino").asText())) dependent++;
                }
                bitacoraService.registrarAccion(actor, diagram.getProyecto(), "ELIMINAR_CLASE_UML",
                        "Diagrama " + diagram.getId() + ": elimino clase "
                                + umlClass.path("nombre").asText("(sin nombre)") + " [" + classId
                                + "] v" + beforeVersion + "->v" + afterVersion
                                + "; relaciones afectadas=" + dependent);
            }
            for (JsonNode relation : before.path("relaciones")) {
                String relationId = relation.path("id").asText();
                if (relationId.isBlank() || currentRelations.contains(relationId)) continue;
                bitacoraService.registrarAccion(actor, diagram.getProyecto(), "ELIMINAR_RELACION_UML",
                        "Diagrama " + diagram.getId() + ": elimino relacion [" + relationId + "] "
                                + relation.path("origen").asText() + "->" + relation.path("destino").asText()
                                + " v" + beforeVersion + "->v" + afterVersion);
            }
        } catch (Exception ignored) {
            // Los modelos heredados no deben impedir que un guardado valido se confirme.
        }
    }

    private void requireEditPermission(Usuario user) {
        boolean roleAllowed = user.getRol() != null
                && Set.of("ADMIN", "ANFITRION", "COLABORADOR").contains(user.getRol().getNombre());
        boolean explicit = user.getPermisos().stream().anyMatch(p -> "EDITAR_DIAGRAMAS".equals(p.getCodigo()));
        boolean rolePermission = user.getRol() != null && user.getRol().getPermisos().stream()
                .anyMatch(p -> "EDITAR_DIAGRAMAS".equals(p.getCodigo()));
        if (!roleAllowed && !explicit && !rolePermission) {
            throw new AccessDeniedException("No tiene permiso para editar diagramas");
        }
    }

    private String fullName(Usuario user) {
        String full = ((user.getNombre() == null ? "" : user.getNombre()) + " "
                + (user.getApellido() == null ? "" : user.getApellido())).trim();
        return full.isBlank() ? user.getCorreo() : full;
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
