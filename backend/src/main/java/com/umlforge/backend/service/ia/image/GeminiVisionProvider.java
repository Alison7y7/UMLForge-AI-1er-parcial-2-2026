package com.umlforge.backend.service.ia.image;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.regex.Pattern;

@Slf4j
@Component
public class GeminiVisionProvider implements ImageIAProvider {

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
    public GeminiVisionProvider(
            ObjectMapper objectMapper,
            @Value("${ia.image.gemini.enabled:true}") boolean enabled,
            @Value("${ia.image.gemini.api-key:}") String apiKey,
            @Value("${ia.image.gemini.model:gemini-3.5-flash-lite}") String model,
            @Value("${ia.image.request-timeout-seconds:60}") long timeoutSeconds) {
        this(objectMapper, enabled, apiKey, model, timeoutSeconds,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                DEFAULT_BASE_URL);
    }

    GeminiVisionProvider(
            ObjectMapper objectMapper,
            boolean enabled,
            String apiKey,
            String model,
            long timeoutSeconds,
            HttpClient httpClient,
            String baseUrl) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey.trim();
        this.model = model.trim();
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.httpClient = httpClient;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    @Override
    public String getName() {
        return "gemini-vision";
    }

    @Override
    public int getPriority() {
        return 10;
    }

    @Override
    public boolean isAvailable() {
        if (!enabled) return false;
        if (apiKey.isBlank()) {
            log.info("Gemini Vision no disponible por falta de API key");
            return false;
        }
        return SAFE_MODEL_NAME.matcher(model).matches();
    }

    @Override
    public ImageIAProviderResult analyze(byte[] image, String mimeType, String prompt) {
        try {
            var textPart = objectMapper.createObjectNode().put("text", prompt);
            var inlineData = objectMapper.createObjectNode();
            inlineData.put("mime_type", mimeType);
            inlineData.put("data", Base64.getEncoder().encodeToString(image));
            var imagePart = objectMapper.createObjectNode().set("inline_data", inlineData);
            var parts = objectMapper.createArrayNode().add(textPart).add(imagePart);
            var content = objectMapper.createObjectNode().set("parts", parts);
            var body = objectMapper.createObjectNode();
            body.set("contents", objectMapper.createArrayNode().add(content));
            var generationConfig = objectMapper.createObjectNode()
                    .put("responseMimeType", "application/json");
            generationConfig.set("responseSchema", umlResponseSchema());
            body.set("generationConfig", generationConfig);

            String endpoint = baseUrl + "/v1beta/models/" + model + ":generateContent";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(timeout)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            long startedAt = System.nanoTime();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            long elapsedMillis = Duration.ofNanos(System.nanoTime() - startedAt).toMillis();
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw httpError(response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String generated = root.path("candidates").path(0).path("content")
                    .path("parts").path(0).path("text").asText();
            if (generated.isBlank()) {
                throw new ImageIAProviderException("Gemini Vision devolvio una respuesta vacia");
            }
            JsonNode usage = root.path("usageMetadata").path("totalTokenCount");
            log.info("Gemini Vision completo con modelo {} en {} ms", model, elapsedMillis);
            return new ImageIAProviderResult(generated, usage.isNumber() ? usage.asInt() : null);
        } catch (ImageIAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ImageIAProviderException("La peticion a Gemini Vision fue interrumpida", e);
        } catch (Exception e) {
            throw new ImageIAProviderException("No se pudo analizar la imagen con Gemini Vision", e);
        }
    }

    private ImageIAProviderException httpError(int statusCode) {
        String detail = switch (statusCode) {
            case 400 -> "solicitud invalida";
            case 401, 403 -> "autenticacion o permisos rechazados";
            case 404 -> "modelo o endpoint no disponible";
            case 408, 504 -> "tiempo de espera agotado";
            case 429 -> "limite de solicitudes excedido";
            default -> statusCode >= 500
                    ? "servicio temporalmente no disponible"
                    : "solicitud rechazada";
        };
        return new ImageIAProviderException(
                "Gemini Vision respondio con estado " + statusCode + " (" + detail + ")");
    }

    private JsonNode umlResponseSchema() {
        ObjectNode string = objectMapper.createObjectNode().put("type", "STRING");
        ObjectNode number = objectMapper.createObjectNode().put("type", "NUMBER");
        ObjectNode visibility = string.deepCopy();
        visibility.set("enum", objectMapper.createArrayNode()
                .add("public").add("private").add("protected").add("unspecified"));
        ObjectNode attributeTypeOrigin = string.deepCopy();
        attributeTypeOrigin.set("enum", objectMapper.createArrayNode()
                .add("IMAGEN").add("SUGERIDO").add("INDETERMINADO"));

        ObjectNode parameter = objectSchema("nombre", "tipo");
        parameter.withObject("properties").set("nombre", string.deepCopy());
        parameter.withObject("properties").set("tipo", string.deepCopy());

        ObjectNode attribute = objectSchema(
                "id", "nombre", "tipo", "visibilidad", "origenTipo");
        attribute.withObject("properties").set("id", string.deepCopy());
        attribute.withObject("properties").set("nombre", string.deepCopy());
        attribute.withObject("properties").set("tipo", string.deepCopy());
        attribute.withObject("properties").set("visibilidad", visibility.deepCopy());
        attribute.withObject("properties").set("origenTipo", attributeTypeOrigin.deepCopy());

        ObjectNode method = objectSchema(
                "id", "nombre", "tipoRetorno", "visibilidad", "parametros");
        method.withObject("properties").set("id", string.deepCopy());
        method.withObject("properties").set("nombre", string.deepCopy());
        method.withObject("properties").set("tipoRetorno", string.deepCopy());
        method.withObject("properties").set("visibilidad", visibility.deepCopy());
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
                "multiplicidadOrigen", "multiplicidadDestino",
                "rolOrigen", "rolDestino", "claseAsociacion");
        for (String property : new String[]{
                "id", "origen", "destino", "tipo", "nombre",
                "multiplicidadOrigen", "multiplicidadDestino",
                "rolOrigen", "rolDestino", "claseAsociacion"}) {
            relation.withObject("properties").set(property, string.deepCopy());
        }

        ObjectNode modelSchema = objectSchema("advertencias", "clases", "relaciones");
        modelSchema.withObject("properties").set("advertencias", arraySchema(string));
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
