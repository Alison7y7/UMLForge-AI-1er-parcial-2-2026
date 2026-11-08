package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.ia.FallbackUmlProvider;
import com.umlforge.backend.service.ia.IAProviderException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

import java.util.stream.Collectors;
import java.text.Normalizer;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DeterministicUmlChatProvider implements ChatIAProvider {

    private final FallbackUmlProvider fallbackUmlProvider;
    private final ObjectMapper objectMapper;

    @Override public String getName() { return "motor-determinista-uml"; }
    @Override public int getPriority() { return 100; }
    @Override public boolean isAvailable() { return true; }
    @Override public String getUnavailableReason() { return ""; }

    @Override
    public ChatIAProviderResult generate(String prompt) {
        if (prompt != null && prompt.contains("MODO: REVISION_UML_INTEGRAL")) {
            try {
                var root = objectMapper.createObjectNode();
                root.put("respuesta", "Revisión formal completada con el motor determinista. "
                        + "Los hallazgos verificables se detallan en el informe compartido. "
                        + "Las sugerencias de dominio requieren contexto adicional y se presentan solo si están justificadas.");
                root.set("hallazgos", objectMapper.createArrayNode());
                root.set("recomendaciones", objectMapper.createArrayNode());
                return new ChatIAProviderResult(objectMapper.writeValueAsString(root), 0);
            } catch (JacksonException e) {
                throw new ChatIAProviderException("No se pudo serializar la revisión determinista", e);
            }
        }
        if (isRelationDesignQuestion(prompt)) return relationAlternatives(prompt);
        if (!isDirectUmlInstruction(prompt)) {
            throw new ChatIAProviderException(
                    "El motor determinista no admite esta consulta conversacional");
        }
        try {
            UmlModelDto model = fallbackUmlProvider.generate(prompt).model();
            String classes = model.clases().stream().map(UmlModelDto.UmlClass::nombre)
                    .collect(Collectors.joining(", "));
            var root = objectMapper.createObjectNode();
            root.put("respuesta", "El motor determinista generó un borrador UML compatible con la instrucción. "
                    + "Clases: " + classes + ". Relaciones: " + model.relaciones().size()
                    + ". Revísalo antes de incorporarlo; no se aplicó ningún cambio al diagrama.");
            root.set("recomendaciones", objectMapper.createArrayNode());
            return new ChatIAProviderResult(objectMapper.writeValueAsString(root), 0);
        } catch (IAProviderException e) {
            throw new ChatIAProviderException(
                    "El motor determinista no admite esta consulta conversacional", e);
        } catch (JacksonException e) {
            throw new ChatIAProviderException("No se pudo serializar el resultado determinista", e);
        }
    }

    private boolean isRelationDesignQuestion(String prompt) {
        String request = normalize(extractUserRequest(prompt));
        return request.contains("relacion") && (request.contains("como") || request.contains("alternativa"));
    }

    private ChatIAProviderResult relationAlternatives(String prompt) {
        try {
            JsonNode model = currentModel(prompt);
            JsonNode usuario = classByName(model, "usuario");
            JsonNode libro = classByName(model, "libro");
            if (usuario == null || libro == null) {
                throw new ChatIAProviderException(
                        "El modelo actual no contiene clases Usuario y Libro inequívocas");
            }
            JsonNode prestamo = classByName(model, "prestamo");
            ObjectNode root = objectMapper.createObjectNode();
            root.put("respuesta", "Una asociación directa N:M es válida. Una clase Prestamo conviene si necesitas fechas, estado o historial; Ejemplar añade control de copias físicas. Elige una alternativa: ninguna se aplicará automáticamente.");
            root.set("hallazgos", objectMapper.createArrayNode());
            root.set("recomendaciones", objectMapper.createArrayNode());
            ArrayNode alternatives = root.putArray("alternativas");

            ObjectNode keep = option(alternatives, "conservar", "Conservar estructura actual",
                    "Mantiene el diseño confirmado sin introducir cambios.", false,
                    "Confirma si el modelo actual ya cubre los requisitos.");
            keep.putArray("ventajas").add("No agrega complejidad");
            keep.putArray("limitaciones").add("Puede no registrar datos propios del préstamo");

            ObjectNode direct = option(alternatives, "directa", "Asociación directa Usuario–Libro",
                    "Representa una relación muchos a muchos sin entidad transaccional.", prestamo == null,
                    "Confirma si deben registrarse fechas, devoluciones o estado.");
            direct.putArray("ventajas").add("Modelo simple y UML válido");
            direct.putArray("limitaciones").add("No almacena atributos de cada préstamo");
            if (!hasRelation(model, usuario.path("id").asText(), libro.path("id").asText())) {
                direct.withArray("recomendaciones").add(relationRecommendation(
                        usuario.path("id").asText(), libro.path("id").asText(),
                        "Usuario", "Libro", "0..*", "0..*"));
            }

            ObjectNode intermediate = option(alternatives, "prestamo", "Prestamo como clase intermedia",
                    "Permite registrar fechas, devolución y estado por operación.", prestamo != null,
                    "Confirma qué datos y reglas pertenecen a cada préstamo.");
            intermediate.putArray("ventajas").add("Conserva información de cada transacción");
            intermediate.putArray("limitaciones").add("Añade una clase y relaciones");
            ArrayNode recs = intermediate.withArray("recomendaciones");
            String loanRef = prestamo == null ? "Prestamo" : prestamo.path("id").asText();
            if (prestamo == null) recs.add(classRecommendation("Prestamo"));
            if (!hasRelation(model, usuario.path("id").asText(), loanRef)) {
                recs.add(relationRecommendation(usuario.path("id").asText(), loanRef,
                        "Usuario", "Prestamo", "1", "0..*"));
            }
            if (!hasRelation(model, loanRef, libro.path("id").asText())) {
                recs.add(relationRecommendation(loanRef, libro.path("id").asText(),
                        "Prestamo", "Libro", "0..*", "1..*"));
            }
            root.set("alternativas", alternatives);
            return new ChatIAProviderResult(objectMapper.writeValueAsString(root), 0);
        } catch (ChatIAProviderException e) {
            throw e;
        } catch (Exception e) {
            throw new ChatIAProviderException("No se pudieron preparar alternativas deterministas", e);
        }
    }

    private ObjectNode option(ArrayNode alternatives, String id, String name, String description,
            boolean recommended, String missing) {
        ObjectNode option = alternatives.addObject();
        option.put("id", id); option.put("nombre", name); option.put("descripcion", description);
        option.put("recomendada", recommended); option.put("requisitosFaltantes", missing);
        option.putArray("ventajas"); option.putArray("limitaciones"); option.putArray("recomendaciones");
        return option;
    }

    private ObjectNode classRecommendation(String name) {
        ObjectNode rec = objectMapper.createObjectNode();
        rec.put("tipoCambio", "AGREGAR_CLASE"); rec.put("descripcion", "Agregar clase " + name);
        rec.put("elementoTipo", "CLASE"); rec.put("elementoId", "");
        ObjectNode proposal = rec.putObject("cambioPropuesto");
        proposal.put("nombre", name); proposal.putArray("atributos"); proposal.putArray("metodos");
        return rec;
    }

    private ObjectNode relationRecommendation(String origin, String destination, String originName,
            String destinationName, String originMultiplicity, String destinationMultiplicity) {
        ObjectNode rec = objectMapper.createObjectNode();
        rec.put("tipoCambio", "AGREGAR_RELACION");
        rec.put("descripcion", "Relacionar " + originName + " con " + destinationName);
        rec.put("elementoTipo", "CLASE"); rec.put("elementoId", origin);
        ObjectNode proposal = rec.putObject("cambioPropuesto");
        proposal.put("origen", origin); proposal.put("destino", destination);
        proposal.put("origenNombre", originName); proposal.put("destinoNombre", destinationName);
        proposal.put("tipo", "ASOCIACION"); proposal.put("multiplicidadOrigen", originMultiplicity);
        proposal.put("multiplicidadDestino", destinationMultiplicity);
        proposal.put("justificacion", "Alternativa de diseño pendiente de confirmación del usuario");
        return rec;
    }

    private JsonNode currentModel(String prompt) throws Exception {
        String marker = "modeloJson: ";
        int start = prompt.indexOf(marker);
        int end = prompt.indexOf("\n\nHISTORIAL COMPARTIDO", start);
        if (start < 0 || end < 0) throw new ChatIAProviderException("No se encontró el modelo actual");
        return objectMapper.readTree(prompt.substring(start + marker.length(), end).trim());
    }

    private JsonNode classByName(JsonNode model, String name) {
        for (JsonNode umlClass : model.path("clases")) {
            if (normalize(umlClass.path("nombre").asText()).equals(name)) return umlClass;
        }
        return null;
    }

    private boolean hasRelation(JsonNode model, String first, String second) {
        for (JsonNode relation : model.path("relaciones")) {
            String origin = relation.path("origen").asText();
            String destination = relation.path("destino").asText();
            if ((origin.equals(first) && destination.equals(second))
                    || (origin.equals(second) && destination.equals(first))) return true;
        }
        return false;
    }

    private String normalize(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "").trim().toLowerCase(Locale.ROOT);
    }

    private boolean isDirectUmlInstruction(String prompt) {
        String request = extractUserRequest(prompt);
        String normalized = normalize(request);
        if (normalized.isBlank() || normalized.contains("?")
                || normalized.matches("^(como|que|cual|cuales|por que|cuando|donde|quien)\\b.*")) {
            return false;
        }
        return normalized.matches("^(crea|crear|genera|generar|modela|modelar|disena|disenar|haz|construye|construir)\\b.*");
    }

    private String extractUserRequest(String prompt) {
        if (prompt == null) return "";
        String marker = "NUEVA SOLICITUD DEL USUARIO:";
        int markerIndex = prompt.lastIndexOf(marker);
        return markerIndex >= 0 ? prompt.substring(markerIndex + marker.length()).trim() : prompt.trim();
    }
}
