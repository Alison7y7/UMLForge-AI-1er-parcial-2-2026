package com.umlforge.backend.service.ia;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Component
public class GeminiProvider implements IAProvider {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final Duration timeout;

    public GeminiProvider(
            ObjectMapper objectMapper,
            @Value("${ia.gemini.enabled:true}") boolean enabled,
            @Value("${ia.gemini.api-key:}") String apiKey,
            @Value("${ia.gemini.model:gemini-2.0-flash}") String model,
            @Value("${ia.request-timeout-seconds:45}") long timeoutSeconds) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey;
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @Override
    public String getName() {
        return "gemini";
    }

    @Override
    public int getPriority() {
        return 20;
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
        return !model.isBlank();
    }

    @Override
    public IAProviderResult generate(String prompt) {
        try {
            var textPart = objectMapper.createObjectNode().put("text", UmlPromptFactory.build(prompt));
            var parts = objectMapper.createArrayNode().add(textPart);
            var content = objectMapper.createObjectNode().set("parts", parts);
            var contents = objectMapper.createArrayNode().add(content);
            var generationConfig = objectMapper.createObjectNode().put("responseMimeType", "application/json");
            var body = objectMapper.createObjectNode();
            body.set("contents", contents);
            body.set("generationConfig", generationConfig);

            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + URLEncoder.encode(model, StandardCharsets.UTF_8)
                    + ":generateContent?key="
                    + URLEncoder.encode(apiKey, StandardCharsets.UTF_8);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IAProviderException("Gemini respondió con estado " + response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String generated = root.path("candidates").path(0).path("content")
                    .path("parts").path(0).path("text").asText();
            JsonNode usage = root.path("usageMetadata").path("totalTokenCount");
            Integer tokens = usage.isNumber() ? usage.asInt() : null;
            return new IAProviderResult(UmlJsonSupport.parseModel(objectMapper, generated), tokens);
        } catch (IAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IAProviderException("La petición a Gemini fue interrumpida", e);
        } catch (Exception e) {
            throw new IAProviderException("No se pudo generar el modelo con Gemini", e);
        }
    }
}
