package com.umlforge.backend.service;

import com.umlforge.backend.dto.ProyectoContinuidadResponse;
import com.umlforge.backend.dto.AdjuntoChatResponse;
import com.umlforge.backend.dto.ProyectoHistorialEventoResponse;
import com.umlforge.backend.dto.ProyectoHistorialResponse;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProyectoHistorialService {
    private static final int MAX_LIMIT = 50;
    private static final int LOOKAHEAD_FACTOR = 3;
    private final ProjectAccessService accessService;
    private final MensajeChatProyectoRepository mensajeRepository;
    private final BitacoraRepository bitacoraRepository;
    private final RecomendacionAplicadaProyectoRepository aplicadaRepository;
    private final DiagramaRepository diagramaRepository;
    private final ProyectoHistorialQueryRepository historialQueryRepository;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public ProyectoHistorialResponse obtener(Long proyectoId, String correo, String cursor, int limite,
            Instant desde, Instant hasta, Long participanteId, String tipo, String busqueda, Long diagramaId) {
        accessService.requireProjectAccess(proyectoId, accessService.requireUser(correo));
        int safeLimit = Math.max(1, Math.min(MAX_LIMIT, limite));
        Instant before = parseCursor(cursor);
        int fetch = safeLimit * LOOKAHEAD_FACTOR + 1;
        Map<String, RecomendacionAplicadaProyecto> applied = appliedMap(proyectoId);
        Map<Long, Diagrama> diagrams = diagramaRepository.findByProyectoId(proyectoId).stream()
                .collect(Collectors.toMap(Diagrama::getId, value -> value));

        List<ProyectoHistorialEventoResponse> candidates = new ArrayList<>();
        LocalDateTime beforeDate = local(before);
        LocalDateTime fromDate = local(desde);
        LocalDateTime toDate = local(hasta);
        String searchTerm = busqueda == null || busqueda.isBlank() ? null : busqueda.trim();
        if (!"ACTIVIDAD".equalsIgnoreCase(tipo) && !"CAMBIO_UML".equalsIgnoreCase(tipo)) {
            historialQueryRepository.searchMessages(proyectoId, beforeDate, fromDate, toDate, participanteId,
                            searchTerm, fetch)
                    .stream().map(message -> fromMessage(message, applied, diagrams))
                    .filter(event -> matches(event, before, desde, hasta, participanteId, tipo, busqueda, diagramaId))
                    .forEach(candidates::add);
        }
        if (!"CONVERSACION".equalsIgnoreCase(tipo) && !"RESPUESTA_IA".equalsIgnoreCase(tipo)
                && !"DECISION".equalsIgnoreCase(tipo)) {
            historialQueryRepository.searchActivities(proyectoId, beforeDate, fromDate, toDate, participanteId,
                            searchTerm, fetch)
                    .stream().map(activity -> fromActivity(activity, diagrams))
                    .filter(event -> matches(event, before, desde, hasta, participanteId, tipo, busqueda, diagramaId))
                    .forEach(candidates::add);
        }
        candidates.sort(Comparator.comparing(ProyectoHistorialEventoResponse::fechaHora,
                Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ProyectoHistorialEventoResponse::id, Comparator.reverseOrder()));
        boolean more = candidates.size() > safeLimit;
        List<ProyectoHistorialEventoResponse> events = candidates.stream().limit(safeLimit).toList();
        String next = more && !events.isEmpty() ? events.get(events.size() - 1).fechaHora().minusNanos(1).toString() : null;
        return new ProyectoHistorialResponse(events, next, more);
    }

    @Transactional(readOnly = true)
    public ProyectoContinuidadResponse continuidad(Long proyectoId, String correo) {
        accessService.requireProjectAccess(proyectoId, accessService.requireUser(correo));
        ProyectoHistorialResponse recent = obtener(proyectoId, correo, null, 20, null, null,
                null, null, null, null);
        List<ProyectoHistorialEventoResponse> changes = recent.eventos().stream()
                .filter(event -> "CAMBIO_UML".equals(event.tipo()) || "DECISION".equals(event.tipo()))
                .limit(5).toList();
        List<ProyectoContinuidadResponse.RecomendacionPendiente> pending = pendingRecommendations(proyectoId);
        var last = diagramaRepository.findFirstByProyectoIdAndActivoTrueOrderByFechaActualizacionDesc(proyectoId)
                .map(diagram -> new ProyectoContinuidadResponse.DiagramaContinuidad(diagram.getId(), diagram.getNombre(),
                        diagram.getVersion(), utc(diagram.getFechaActualizacion()))).orElse(null);
        Instant lastActivity = recent.eventos().isEmpty() ? null : recent.eventos().get(0).fechaHora();
        return new ProyectoContinuidadResponse(last, lastActivity, changes, pending.size(),
                pending.stream().limit(5).toList());
    }

    private List<ProyectoContinuidadResponse.RecomendacionPendiente> pendingRecommendations(Long projectId) {
        Map<String, RecomendacionAplicadaProyecto> applied = appliedMap(projectId);
        Map<Long, Diagrama> diagrams = diagramaRepository.findByProyectoId(projectId).stream()
                .collect(Collectors.toMap(Diagrama::getId, value -> value));
        List<ProyectoContinuidadResponse.RecomendacionPendiente> result = new ArrayList<>();
        for (MensajeChatProyecto message : mensajeRepository.findByProyectoIdOrderByFechaHoraDescIdDesc(
                projectId, PageRequest.of(0, 100))) {
            if (message.getTipoEmisor() != TipoEmisorChat.IA) continue;
            JsonNode root = readMetadata(message);
            Set<String> discarded = new HashSet<>();
            root.path("recomendacionesDescartadasIds").forEach(value -> discarded.add(value.asText()));
            for (JsonNode recommendation : root.path("recomendaciones")) {
                String id = recommendation.path("id").asText();
                if (id.isBlank() || discarded.contains(id) || applied.containsKey(key(message.getId(), id))) continue;
                Long diagramId = longOrNull(recommendation.path("diagramaId"));
                Long origin = longOrNull(recommendation.path("versionDiagrama"));
                Diagrama diagram = diagrams.get(diagramId);
                String status = diagram != null && Objects.equals(origin, diagram.getVersion()) ? "PENDIENTE" : "OBSOLETA";
                result.add(new ProyectoContinuidadResponse.RecomendacionPendiente(message.getId(), id, diagramId,
                        recommendation.path("descripcion").asText("Propuesta UML"), status));
            }
        }
        return result;
    }

    private ProyectoHistorialEventoResponse fromMessage(MensajeChatProyecto message,
            Map<String, RecomendacionAplicadaProyecto> applied, Map<Long, Diagrama> diagrams) {
        JsonNode original = readMetadata(message);
        ObjectNode metadata = mapper.createObjectNode();
        copyIfPresent(original, metadata, "evento", "diagramaId", "diagramaVersion", "tipoInforme", "hallazgos");
        if (original.path("recomendaciones").isArray()) {
            ArrayNode recommendations = metadata.putArray("recomendaciones");
            Set<String> discarded = new HashSet<>();
            original.path("recomendacionesDescartadasIds").forEach(value -> discarded.add(value.asText()));
            for (JsonNode item : original.path("recomendaciones")) {
                ObjectNode copy = item instanceof ObjectNode object ? object.deepCopy() : mapper.createObjectNode();
                String recId = item.path("id").asText();
                RecomendacionAplicadaProyecto application = applied.get(key(message.getId(), recId));
                Long diagramId = longOrNull(item.path("diagramaId"));
                Long origin = longOrNull(item.path("versionDiagrama"));
                Diagrama diagram = diagrams.get(diagramId);
                String status = application != null ? "APLICADA" : discarded.contains(recId) ? "DESCARTADA"
                        : diagram != null && Objects.equals(origin, diagram.getVersion()) ? "PENDIENTE" : "OBSOLETA";
                copy.put("estadoHistorial", status);
                if (application != null) copy.put("versionResultado", application.getVersionResultado());
                recommendations.add(copy);
            }
        }
        Long diagramId = longOrNull(original.path("diagramaId"));
        Diagrama diagram = diagrams.get(diagramId);
        Usuario user = message.getUsuarioEmisor();
        String type = message.getTipoEmisor() == TipoEmisorChat.IA ? "RESPUESTA_IA"
                : message.getTipoEmisor() == TipoEmisorChat.SISTEMA ? "DECISION" : "CONVERSACION";
        String title = message.getTipoEmisor() == TipoEmisorChat.IA ? "Respuesta de IA"
                : message.getTipoEmisor() == TipoEmisorChat.SISTEMA ? "Decisión del proyecto" : "Mensaje del proyecto";
        return new ProyectoHistorialEventoResponse("CHAT:" + message.getId(), type, utc(message.getFechaHora()),
                user == null ? null : user.getId(), user == null ? label(message.getTipoEmisor()) : fullName(user),
                diagramId, diagram == null ? null : diagram.getNombre(), title, message.getContenido(),
                message.getEstado().name(), metadata, message.getAdjuntos().stream().map(attachment ->
                        new AdjuntoChatResponse(attachment.getId(), attachment.getNombreOriginal(),
                                attachment.getTamanoBytes(), attachment.getMimeType(), attachment.getCategoria(),
                                "/api/proyectos/" + message.getProyecto().getId() + "/chat/adjuntos/"
                                        + attachment.getId() + "/contenido")).toList());
    }

    private ProyectoHistorialEventoResponse fromActivity(Bitacora activity, Map<Long, Diagrama> diagrams) {
        String action = Optional.ofNullable(activity.getAccion()).orElse("");
        String type = action.contains("DIAGRAMA") || action.contains("RECOMENDACION")
                || action.startsWith("ELIMINAR_CLASE") || action.startsWith("ELIMINAR_RELACION")
                ? "CAMBIO_UML" : "ACTIVIDAD";
        Usuario user = activity.getUsuario();
        Diagrama diagram = inferDiagram(activity.getDescripcion(), diagrams);
        return new ProyectoHistorialEventoResponse("ACTIVIDAD:" + activity.getId(), type, utc(activity.getFechaHora()),
                user == null ? null : user.getId(), user == null ? null : fullName(user),
                diagram == null ? null : diagram.getId(), diagram == null ? null : diagram.getNombre(),
                action.replace('_', ' '), activity.getDescripcion(), "REGISTRADA", mapper.createObjectNode(), List.of());
    }

    private Diagrama inferDiagram(String description, Map<Long, Diagrama> diagrams) {
        String text = Optional.ofNullable(description).orElse("");
        var matcher = java.util.regex.Pattern.compile("(?i)\\bdiagrama\\s+(\\d+)\\b").matcher(text);
        if (matcher.find()) {
            try {
                Diagrama byId = diagrams.get(Long.parseLong(matcher.group(1)));
                if (byId != null) return byId;
            } catch (NumberFormatException ignored) { }
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        return diagrams.values().stream()
                .filter(diagram -> diagram.getNombre() != null
                        && normalized.contains(diagram.getNombre().toLowerCase(Locale.ROOT)))
                .max(Comparator.comparingInt(diagram -> diagram.getNombre().length()))
                .orElse(null);
    }

    private boolean matches(ProyectoHistorialEventoResponse event, Instant before, Instant from, Instant to,
            Long participant, String type, String search, Long diagramId) {
        if (event.fechaHora() == null || (before != null && !event.fechaHora().isBefore(before))) return false;
        if (from != null && event.fechaHora().isBefore(from)) return false;
        if (to != null && event.fechaHora().isAfter(to)) return false;
        if (participant != null && !participant.equals(event.participanteId())) return false;
        if (diagramId != null && !diagramId.equals(event.diagramaId())) return false;
        if (type != null && !type.isBlank() && !type.equalsIgnoreCase(event.tipo())) return false;
        if (search != null && !search.isBlank()) {
            String haystack = (event.titulo() + " " + event.detalle() + " " + event.participanteNombre()).toLowerCase();
            if (!haystack.contains(search.trim().toLowerCase())) return false;
        }
        return true;
    }

    private Map<String, RecomendacionAplicadaProyecto> appliedMap(Long projectId) {
        return aplicadaRepository.findByProyectoId(projectId).stream().collect(Collectors.toMap(
                value -> key(value.getMensajeIa().getId(), value.getRecomendacionId()), value -> value, (a, b) -> a));
    }

    private JsonNode readMetadata(MensajeChatProyecto message) {
        try { return mapper.readTree(Optional.ofNullable(message.getMetadatos()).orElse("{}")); }
        catch (Exception ignored) { return mapper.createObjectNode(); }
    }

    private void copyIfPresent(JsonNode source, ObjectNode target, String... fields) {
        for (String field : fields) if (source.has(field)) target.set(field, source.get(field).deepCopy());
    }

    private Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        try { return Instant.parse(cursor); } catch (Exception ignored) { return null; }
    }
    private Instant utc(LocalDateTime value) { return value == null ? null : value.toInstant(ZoneOffset.UTC); }
    private LocalDateTime local(Instant value) { return value == null ? null : LocalDateTime.ofInstant(value, ZoneOffset.UTC); }
    private Long longOrNull(JsonNode value) { return value != null && value.isNumber() ? value.longValue() : null; }
    private String key(Long messageId, String recommendationId) { return messageId + ":" + recommendationId; }
    private String label(TipoEmisorChat type) { return type == TipoEmisorChat.IA ? "IA" : "Sistema"; }
    private String fullName(Usuario user) {
        String value = ((user.getNombre() == null ? "" : user.getNombre()) + " "
                + (user.getApellido() == null ? "" : user.getApellido())).trim();
        return value.isBlank() ? user.getCorreo() : value;
    }
}
