package com.umlforge.backend.service.ia.image;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;

@Slf4j
@Component
public class GeminiVisionProvider implements ImageIAProvider {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final Duration timeout;

    public GeminiVisionProvider(
            ObjectMapper objectMapper,
            @Value("${ia.image.gemini.enabled:true}") boolean enabled,
            @Value("${ia.image.gemini.api-key:}") String apiKey,
            @Value("${ia.image.gemini.model:gemini-2.0-flash}") String model,
            @Value("${ia.image.request-timeout-seconds:60}") long timeoutSeconds) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.apiKey = apiKey.trim();
        this.model = model.trim();
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
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
        return !model.isBlank();
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
            body.set("generationConfig", objectMapper.createObjectNode()
                    .put("responseMimeType", "application/json"));

            String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/"
                    + URLEncoder.encode(model, StandardCharsets.UTF_8)
                    + ":generateContent?key="
                    + URLEncoder.encode(apiKey, StandardCharsets.UTF_8);
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
                        "Gemini Vision respondio con estado " + response.statusCode() + ": " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String generated = root.path("candidates").path(0).path("content")
                    .path("parts").path(0).path("text").asText();
            if (generated.isBlank()) {
                throw new ImageIAProviderException("Gemini Vision devolvio una respuesta vacia");
            }
            JsonNode usage = root.path("usageMetadata").path("totalTokenCount");
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
}
