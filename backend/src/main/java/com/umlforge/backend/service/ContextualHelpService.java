package com.umlforge.backend.service;

import com.umlforge.backend.dto.ContextualHelpResponse;
import com.umlforge.backend.dto.ContextualHelpResponse.HelpLink;
import com.umlforge.backend.dto.HelpManualResponse;
import com.umlforge.backend.dto.HelpManualResponse.HelpArticle;
import com.umlforge.backend.dto.HelpManualResponse.HelpTopic;
import com.umlforge.backend.entity.Usuario;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ContextualHelpService {
    private static final Set<String> STOP_WORDS = Set.of(
            "a", "al", "algo", "como", "con", "cual", "de", "del", "desde", "donde", "el", "en",
            "es", "esta", "este", "hay", "la", "las", "lo", "los", "me", "mi", "para", "por", "que",
            "se", "sin", "su", "un", "una", "uno", "y", "yo");
    private static final Set<String> ALLOWED_CONTEXTS = Set.of(
            "dashboard", "proyectos", "proyecto", "editor", "chat", "historial", "mobile", "notificaciones");
    private static final Map<String, String> SYNONYMS = synonyms();

    private final ObjectMapper mapper;
    private final ProjectAccessService access;
    private JsonNode knowledgeBase;
    private JsonNode articles;

    @PostConstruct
    void load() throws Exception {
        knowledgeBase = mapper.readTree(new ClassPathResource("help/knowledge-base.json").getInputStream());
        articles = knowledgeBase.path("articles");
    }

    public ContextualHelpResponse answer(String question, String context, String email) {
        Usuario user = access.requireUser(email);
        String normalized = normalize(question);
        String safeContext = normalizeContext(context);

        if (asksForSensitiveInformation(normalized)) {
            return response(
                    "La ayuda no revela contraseñas, tokens, correos privados ni datos de otros usuarios o proyectos. "
                            + "Consulta únicamente la información que tu rol muestra en la aplicación.",
                    List.of("Vuelve a formular la pregunta sobre cómo usar una función, sin solicitar datos privados."),
                    List.of(), safeContext, "POLITICA_PRIVACIDAD");
        }
        if (asksForMutation(normalized)) {
            return response(
                    "La ayuda contextual no puede crear, eliminar ni modificar elementos UML. Usa el Chat del proyecto; "
                            + "allí la IA puede proponer un cambio que deberá revisarse antes de aplicarlo.",
                    List.of("Abre el proyecto o editor.", "Entra en Chat.",
                            "Solicita el cambio y revisa la recomendación antes de aplicarla."),
                    List.of(), safeContext, "POLITICA_SOLO_LECTURA");
        }

        Set<String> queryTerms = canonicalTerms(normalized);
        JsonNode best = null;
        int bestScore = 0;
        for (JsonNode article : articles) {
            int score = score(article, normalized, queryTerms, safeContext);
            if (score > bestScore) {
                best = article;
                bestScore = score;
            }
        }

        if (best == null) {
            return response(
                    "No encontré una instrucción específica para esa pregunta. Prueba con el nombre visible de la acción "
                            + "o abre Manual y tutorial para explorar acceso, proyectos, editor UML, colaboración, IA, "
                            + "historial, XMI, móvil y notificaciones.",
                    List.of("Abre la pestaña Manual y tutorial.", "Busca el nombre de la pantalla o del botón.",
                            "Si se trata de una función no disponible, consulta al administrador del sistema."),
                    List.of(), safeContext, "BASE_LOCAL:sin-coincidencia");
        }

        boolean restricted = best.path("requiresProjectManagement").asBoolean(false) && !canManageProjects(user);
        String answer = best.path("answer").asText();
        if (restricted) {
            answer += " Tu rol actual puede no mostrar esta acción; solicita ayuda al anfitrión o a un administrador autorizado.";
        }
        return response(answer, strings(best.path("steps")), links(best.path("links")), safeContext,
                "BASE_LOCAL:" + best.path("id").asText());
    }

    public HelpManualResponse manual(String email) {
        Usuario user = access.requireUser(email);
        Map<String, List<HelpArticle>> grouped = new LinkedHashMap<>();
        for (JsonNode category : knowledgeBase.path("categories")) {
            grouped.put(category.path("id").asText(), new ArrayList<>());
        }
        for (JsonNode article : articles) {
            boolean restricted = article.path("requiresProjectManagement").asBoolean(false) && !canManageProjects(user);
            String permissionNote = restricted
                    ? "Tu rol actual puede no mostrar esta acción; requiere autorización de anfitrión o administrador."
                    : article.path("permissionNote").asText("");
            grouped.computeIfAbsent(article.path("category").asText(), ignored -> new ArrayList<>()).add(
                    new HelpArticle(article.path("id").asText(), article.path("title").asText(),
                            article.path("summary").asText(), article.path("answer").asText(),
                            strings(article.path("steps")), links(article.path("links")),
                            strings(article.path("contexts")), strings(article.path("searchTerms")), permissionNote));
        }

        List<HelpTopic> topics = new ArrayList<>();
        for (JsonNode category : knowledgeBase.path("categories")) {
            String id = category.path("id").asText();
            topics.add(new HelpTopic(id, category.path("title").asText(), category.path("description").asText(),
                    List.copyOf(grouped.getOrDefault(id, List.of()))));
        }
        return new HelpManualResponse(knowledgeBase.path("title").asText(),
                knowledgeBase.path("description").asText(), topics,
                strings(knowledgeBase.path("suggestedQuestions")), true);
    }

    private ContextualHelpResponse response(String answer, List<String> steps, List<HelpLink> links,
            String context, String source) {
        return new ContextualHelpResponse(answer, steps, links, context, source, true);
    }

    private int score(JsonNode article, String normalizedQuestion, Set<String> queryTerms, String context) {
        Set<String> anchors = canonicalTerms(strings(article.path("anchors")));
        Set<String> intents = canonicalTerms(strings(article.path("intents")));
        Set<String> anchorMatches = intersection(queryTerms, anchors);
        if (anchorMatches.isEmpty()) return 0;

        int phraseScore = 0;
        for (JsonNode phrase : article.path("phrases")) {
            if (containsPhrase(normalizedQuestion, normalize(phrase.asText()))) phraseScore = Math.max(phraseScore, 14);
        }
        int intentMatches = intersection(queryTerms, intents).size();
        int score = phraseScore + anchorMatches.size() * 8 + intentMatches * 3;
        for (JsonNode articleContext : article.path("contexts")) {
            if (context.equals(articleContext.asText())) score += 2;
        }
        return score;
    }

    private Set<String> intersection(Set<String> left, Set<String> right) {
        Set<String> result = new HashSet<>(left);
        result.retainAll(right);
        return result;
    }

    private Set<String> canonicalTerms(List<String> values) {
        Set<String> result = new LinkedHashSet<>();
        for (String value : values) result.addAll(canonicalTerms(normalize(value)));
        return result;
    }

    private Set<String> canonicalTerms(String normalized) {
        Set<String> result = new LinkedHashSet<>();
        if (normalized.isBlank()) return result;
        for (String token : normalized.split("\\s+")) {
            if (token.length() < 2 || STOP_WORDS.contains(token)) continue;
            result.add(SYNONYMS.getOrDefault(token, token));
        }
        return result;
    }

    private boolean canManageProjects(Usuario user) {
        String role = user.getRol() == null ? "" : user.getRol().getNombre();
        return Set.of("ADMIN", "ANFITRION").contains(role)
                || (user.getPermisos() != null
                && user.getPermisos().stream().anyMatch(p -> "GESTIONAR_PROYECTOS".equals(p.getCodigo())));
    }

    private boolean asksForMutation(String question) {
        boolean imperative = question.matches(".*\\b(crea|creame|elimina|borra|modifica|agrega|anade|aplica)\\b.*");
        boolean umlTarget = question.matches(".*\\b(clase|relacion|atributo|metodo|diagrama|uml)\\b.*");
        boolean instructional = question.matches(".*\\b(como|donde|puedo|pasos|explica)\\b.*");
        return imperative && umlTarget && !instructional;
    }

    private boolean asksForSensitiveInformation(String question) {
        boolean asksToReveal = question.matches(".*\\b(dame|muestra|revela|lista|extrae|obten)\\b.*");
        boolean sensitive = question.matches(".*\\b(contrasena|password|token|secreto|correos|datos privados)\\b.*");
        return asksToReveal && sensitive;
    }

    private List<String> strings(JsonNode node) {
        List<String> result = new ArrayList<>();
        node.forEach(value -> result.add(value.asText()));
        return result;
    }

    private List<HelpLink> links(JsonNode node) {
        List<HelpLink> result = new ArrayList<>();
        node.forEach(value -> result.add(new HelpLink(value.path("label").asText(), value.path("url").asText())));
        return result;
    }

    private String normalizeContext(String value) {
        String clean = normalize(value == null ? "general" : value);
        return ALLOWED_CONTEXTS.contains(clean) ? clean : "general";
    }

    private boolean containsPhrase(String value, String phrase) {
        return (" " + value + " ").contains(" " + phrase + " ");
    }

    private String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replaceAll("[^a-z0-9@.*\\s-]", " ")
                .replaceAll("\\s+", " ").trim();
    }

    private static Map<String, String> synonyms() {
        Map<String, String> map = new HashMap<>();
        alias(map, "login", "acceder", "acceso", "entrar", "ingresar", "autenticarme", "identificarme");
        alias(map, "registro", "registrar", "registrarme", "registro", "cuenta", "inscribirme");
        alias(map, "recuperar_clave", "recuperar", "restablecer", "olvide", "olvidada");
        alias(map, "proyecto", "proyecto", "proyectos");
        alias(map, "invitar", "invitar", "invito", "invitacion", "incorporar", "incorporo", "sumar");
        alias(map, "participante", "persona", "personas", "participante", "participantes", "miembro", "miembros", "equipo");
        alias(map, "rol", "rol", "roles", "perfil", "perfiles", "permiso", "permisos");
        alias(map, "administrador", "administrador", "admin");
        alias(map, "anfitrion", "anfitrion", "dueno");
        alias(map, "colaborador", "colaborador", "colaboradores");
        alias(map, "clase", "clase", "clases");
        alias(map, "atributo", "atributo", "atributos", "campo", "campos", "propiedad", "propiedades");
        alias(map, "metodo", "metodo", "metodos", "operacion", "operaciones", "funcion", "funciones");
        alias(map, "relacion", "relacion", "relaciones", "relacionar", "conectar", "conexion", "asociacion", "herencia", "agregacion", "composicion", "dependencia", "generalizacion");
        alias(map, "multiplicidad", "multiplicidad", "multiplicidades", "cardinalidad", "cardinalidades");
        alias(map, "organizar", "organizar", "ordenar", "acomodar", "mover", "distribuir");
        alias(map, "guardar", "guardar", "guardo", "salvar", "persistir", "conservar");
        alias(map, "colaboracion", "colaboracion", "colaborativo", "simultaneo", "tiempo", "sincronizacion", "sincronizar");
        alias(map, "chat", "chat", "conversacion", "conversaciones", "mensajes", "mensaje");
        alias(map, "ia", "ia", "inteligencia", "asistente");
        alias(map, "revision", "revision", "revisar", "analizar", "analisis");
        alias(map, "recomendacion", "recomendacion", "recomendaciones", "sugerencia", "sugerencias", "mejora", "mejoras");
        alias(map, "aplicar", "aplicar", "aplico", "aprobar", "aceptar", "confirmar");
        alias(map, "descartar", "descartar", "descarto", "rechazar", "ignorar");
        alias(map, "alternativa", "alternativa", "alternativas", "opcion", "opciones");
        alias(map, "historial", "historial", "actividad", "actividades", "bitacora");
        alias(map, "continuidad", "continuar", "continuo", "retomar", "reanudar", "volver");
        alias(map, "anterior", "anterior", "anteriores", "previo", "previa", "pasado", "ayer");
        alias(map, "importar", "importar", "importo", "cargar", "subir");
        alias(map, "exportar", "exportar", "exporto", "descargar");
        alias(map, "xmi", "xmi");
        alias(map, "backend", "backend", "spring", "codigo");
        alias(map, "mobile", "movil", "celular", "telefono", "smartphone", "pwa");
        alias(map, "notificacion", "notificacion", "notificaciones", "push", "aviso", "avisos", "alerta", "alertas");
        alias(map, "https", "https", "seguro", "tls");
        alias(map, "generar", "generar", "genero", "crear", "creo", "agregar", "agrego", "anadir");
        return Map.copyOf(map);
    }

    private static void alias(Map<String, String> map, String canonical, String... values) {
        Arrays.stream(values).forEach(value -> map.put(value, canonical));
    }
}
