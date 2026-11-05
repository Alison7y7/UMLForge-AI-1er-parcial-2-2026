package com.umlforge.backend.service.ia;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.regex.Pattern;

@Slf4j
@Component
public class GeminiProvider implements IAProvider {

    private static final String DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
    private static final Pattern SAFE_MODEL_NAME = Pattern.compile("[A-Za-z0-9._-]+");

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final Duration timeout;
    private final String baseUrl;

    @Autowired
    public GeminiProvider(
            ObjectMapper objectMapper,
            @Value("${ia.gemini.enabled:true}") boolean enabled,
            @Value("${ia.gemini.api-key:}") String apiKey,
            @Value("${ia.gemini.model:gemini-3.5-flash-lite}") String model,
            @Value("${ia.gemini.request-timeout-seconds:${ia.request-timeout-seconds:45}}") long timeoutSeconds) {
        this(objectMapper, enabled, apiKey, model, timeoutSeconds,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                DEFAULT_BASE_URL);
    }

    GeminiProvider(
            ObjectMapper objectMapper,
            boolean enabled,
            String apiKey,
            String model,
            long timeoutSeconds,
            HttpClient httpClient,
            String baseUrl) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.httpClient = httpClient;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @Override
    public String getName() {
        return "gemini";
    }

    @Override
    public int getPriority() {
        return 10;
    }

    @Override
    public boolean isAvailable() {
        if (!enabled) {
            return false;
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.info("Gemini no disponible por falta de API key");
            return false;
        }
        return model != null && SAFE_MODEL_NAME.matcher(model).matches();
    }

    @Override
    public String getUnavailableReason() {
        if (!enabled) return "proveedor deshabilitado";
        if (apiKey == null || apiKey.isBlank()) return "API key no configurada";
        if (model == null || model.isBlank()) return "modelo no configurado";
        if (!SAFE_MODEL_NAME.matcher(model).matches()) return "nombre de modelo invalido";
        return IAProvider.super.getUnavailableReason();
    }

    @Override
    public IAProviderResult generate(String prompt) {
        try {
            var textPart = objectMapper.createObjectNode().put("text", UmlPromptFactory.build(prompt));
            var parts = objectMapper.createArrayNode().add(textPart);
            var content = objectMapper.createObjectNode().set("parts", parts);
            var contents = objectMapper.createArrayNode().add(content);
            var generationConfig = objectMapper.createObjectNode()
                    .put("responseMimeType", "application/json");
            generationConfig.set("responseSchema", umlResponseSchema());
            var body = objectMapper.createObjectNode();
            body.set("contents", contents);
            body.set("generationConfig", generationConfig);

            String endpoint = baseUrl + "/v1beta/models/"
                    + URLEncoder.encode(model, StandardCharsets.UTF_8)
                    + ":generateContent";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw httpError(response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode generatedNode = root.path("candidates").path(0).path("content")
                    .path("parts").path(0).path("text");
            if (!generatedNode.isTextual() || generatedNode.asText().isBlank()) {
                throw new IAProviderException("Gemini no devolvió contenido UML utilizable");
            }
            JsonNode usage = root.path("usageMetadata").path("totalTokenCount");
            Integer tokens = usage.isNumber() ? usage.asInt() : null;
            return new IAProviderResult(
                    UmlJsonSupport.parseModel(objectMapper, generatedNode.asText()), tokens);
        } catch (IAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IAProviderException("La petición a Gemini fue interrumpida", e);
        } catch (Exception e) {
            throw new IAProviderException("No se pudo generar el modelo con Gemini", e);
        }
    }

    private IAProviderException httpError(int statusCode) {
        String detail = switch (statusCode) {
            case 400 -> "solicitud inválida";
            case 401, 403 -> "autenticación o permisos rechazados";
            case 404 -> "modelo o endpoint no disponible";
            case 408, 504 -> "tiempo de espera agotado";
            case 429 -> "límite de solicitudes excedido";
            default -> statusCode >= 500
                    ? "servicio temporalmente no disponible"
                    : "solicitud rechazada";
        };
        return new IAProviderException(
                "Gemini respondió con estado " + statusCode + " (" + detail + ")");
    }

    private JsonNode umlResponseSchema() {
        ObjectNode string = objectMapper.createObjectNode().put("type", "STRING");
        ObjectNode number = objectMapper.createObjectNode().put("type", "NUMBER");

        ObjectNode parameter = objectSchema("nombre", "tipo");
        parameter.withObject("properties").set("nombre", string.deepCopy());
        parameter.withObject("properties").set("tipo", string.deepCopy());

        ObjectNode attribute = objectSchema("id", "nombre", "tipo", "visibilidad");
        attribute.withObject("properties").set("id", string.deepCopy());
        attribute.withObject("properties").set("nombre", string.deepCopy());
        attribute.withObject("properties").set("tipo", string.deepCopy());
        attribute.withObject("properties").set("visibilidad", string.deepCopy());

        ObjectNode method = objectSchema(
                "id", "nombre", "tipoRetorno", "visibilidad", "parametros");
        method.withObject("properties").set("id", string.deepCopy());
        method.withObject("properties").set("nombre", string.deepCopy());
        method.withObject("properties").set("tipoRetorno", string.deepCopy());
        method.withObject("properties").set("visibilidad", string.deepCopy());
        method.withObject("properties").set("parametros", arraySchema(parameter));

        ObjectNode umlClass = objectSchema(
                "id", "nombre", "estereotipo", "posicionX", "posicionY", "atributos", "metodos");
        umlClass.withObject("properties").set("id", string.deepCopy());
        umlClass.withObject("properties").set("nombre", string.deepCopy());
        umlClass.withObject("properties").set("estereotipo", string.deepCopy());
        umlClass.withObject("properties").set("posicionX", number.deepCopy());
        umlClass.withObject("properties").set("posicionY", number.deepCopy());
        umlClass.withObject("properties").set("atributos", arraySchema(attribute));
        umlClass.withObject("properties").set("metodos", arraySchema(method));

        ObjectNode relation = objectSchema(
                "id", "origen", "destino", "tipo", "nombre",
                "multiplicidadOrigen", "multiplicidadDestino");
        for (String property : new String[]{
                "id", "origen", "destino", "tipo", "nombre",
                "multiplicidadOrigen", "multiplicidadDestino",
                "rolOrigen", "rolDestino", "claseAsociacion"}) {
            relation.withObject("properties").set(property, string.deepCopy());
        }

        ObjectNode modelSchema = objectSchema("clases", "relaciones");
        modelSchema.withObject("properties").set("clases", arraySchema(umlClass));
        modelSchema.withObject("properties").set("relaciones", arraySchema(relation));
        return modelSchema;
    }

    private ObjectNode objectSchema(String... requiredProperties) {
        ObjectNode schema = objectMapper.createObjectNode().put("type", "OBJECT");
        schema.set("properties", objectMapper.createObjectNode());
        var required = objectMapper.createArrayNode();
        for (String property : requiredProperties) {
            required.add(property);
        }
        schema.set("required", required);
        return schema;
    }

    private ObjectNode arraySchema(JsonNode items) {
        ObjectNode schema = objectMapper.createObjectNode().put("type", "ARRAY");
        schema.set("items", items);
        return schema;
    }
}
