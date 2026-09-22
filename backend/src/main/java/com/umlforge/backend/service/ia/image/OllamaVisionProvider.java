package com.umlforge.backend.service.ia.image;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Slf4j
@Component
public class OllamaVisionProvider implements ImageIAProvider {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String baseUrl;
    private final String model;
    private final Duration timeout;

    public OllamaVisionProvider(
            ObjectMapper objectMapper,
            @Value("${ia.image.ollama.enabled:true}") boolean enabled,
            @Value("${ia.image.ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ia.image.ollama.model:gemma3:4b}") String model,
            @Value("${ia.image.request-timeout-seconds:60}") long timeoutSeconds) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.baseUrl = baseUrl.trim().replaceAll("/+$", "");
        this.model = model.trim();
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    @Override
    public String getName() {
        return "ollama-vision";
    }

    @Override
    public int getPriority() {
        return 20;
    }

    @Override
    public boolean isAvailable() {
        return enabled && !baseUrl.isBlank() && !model.isBlank();
    }

    @Override
    public ImageIAProviderResult analyze(byte[] image, String mimeType, String prompt) {
        try {
            var body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("prompt", prompt);
            body.put("stream", false);
            body.put("format", "json");
            body.set("images", objectMapper.createArrayNode()
                    .add(Base64.getEncoder().encodeToString(image)));

            String endpoint = baseUrl.endsWith("/api/generate")
                    ? baseUrl
                    : baseUrl + "/api/generate";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(timeout)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ImageIAProviderException(
                        "Ollama Vision respondio con estado " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String generated = root.path("response").asText();
            if (generated.isBlank()) {
                throw new ImageIAProviderException("Ollama Vision devolvio una respuesta vacia");
            }
            JsonNode tokenCount = root.path("eval_count");
            return new ImageIAProviderResult(generated, tokenCount.isNumber() ? tokenCount.asInt() : null);
        } catch (ImageIAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ImageIAProviderException("La peticion a Ollama Vision fue interrumpida", e);
        } catch (Exception e) {
            throw new ImageIAProviderException("No se pudo analizar la imagen con Ollama Vision", e);
        }
    }
}
