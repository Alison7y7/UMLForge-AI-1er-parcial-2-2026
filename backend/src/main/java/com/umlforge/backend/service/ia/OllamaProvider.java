package com.umlforge.backend.service.ia;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.JacksonException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Component
public class OllamaProvider implements IAProvider {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String baseUrl;
    private final String model;
    private final Duration timeout;
    private final int numCtx;
    private final int numPredict;
    private final double temperature;
    private final String keepAlive;

    public OllamaProvider(
            ObjectMapper objectMapper,
            @Value("${ia.ollama.enabled:true}") boolean enabled,
            @Value("${ia.ollama.base-url:http://localhost:11434}") String baseUrl,
            @Value("${ia.ollama.model:llama3.1}") String model,
            @Value("${ia.ollama.request-timeout-seconds:${ia.request-timeout-seconds:90}}") long timeoutSeconds,
            @Value("${ia.ollama.num-ctx:3072}") int numCtx,
            @Value("${ia.ollama.num-predict:1200}") int numPredict,
            @Value("${ia.ollama.temperature:0.0}") double temperature,
            @Value("${ia.ollama.keep-alive:10m}") String keepAlive) {
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.baseUrl = baseUrl.trim().replaceAll("/+$", "");
        this.model = model.trim();
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.numCtx = numCtx;
        this.numPredict = numPredict;
        this.temperature = temperature;
        this.keepAlive = keepAlive.trim();
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    }

    @Override
    public String getName() {
        return "ollama";
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
    public String getUnavailableReason() {
        if (!enabled) return "proveedor deshabilitado";
        if (baseUrl.isBlank()) return "URL base no configurada";
        if (model.isBlank()) return "modelo no configurado";
        return IAProvider.super.getUnavailableReason();
    }

    @Override
    public IAProviderResult generate(String prompt) {
        try {
            var body = objectMapper.createObjectNode();
            body.put("model", model);
            body.put("prompt", UmlPromptFactory.buildForOllama(prompt));
            body.put("stream", false);
            body.put("format", "json");
            body.put("keep_alive", keepAlive);
            var options = body.putObject("options");
            options.put("num_ctx", numCtx);
            options.put("num_predict", numPredict);
            options.put("temperature", temperature);

            String endpoint = baseUrl.endsWith("/api/generate")
                    ? baseUrl
                    : baseUrl + "/api/generate";
            String requestBody = objectMapper.writeValueAsString(body);

            log.info("Ollama URL: {}", endpoint);
            log.info("Ollama MODEL: {}", model);
            log.debug("Peticion a Ollama preparada con {} caracteres", requestBody.length());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .timeout(timeout)
                    .header("Content-Type", "application/json; charset=UTF-8")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String message = "Error HTTP de Ollama. Estado " + response.statusCode()
                        + ". Respuesta: " + response.body();
                log.error(message);
                throw new IAProviderException(message);
            }

            JsonNode root;
            try {
                root = objectMapper.readTree(response.body());
            } catch (JacksonException e) {
                log.error("Error de parseo del contenedor JSON HTTP devuelto por Ollama", e);
                throw new IAProviderException(
                        "Error de parseo del contenedor JSON de Ollama: " + e.getMessage(), e
                );
            }

            String generated = root.path("response").asText();
            log.debug("Ollama devolvio {} caracteres", generated.length());

            try {
                Integer tokens = root.has("eval_count") ? root.get("eval_count").asInt() : null;
                return new IAProviderResult(UmlJsonSupport.parseOllamaModel(objectMapper, generated), tokens);
            } catch (IAProviderException e) {
                log.error("Error de parseo JSON UML en la respuesta de Ollama: {}", e.getMessage(), e);
                throw new IAProviderException(
                        "Error de parseo JSON UML de Ollama: " + e.getMessage(), e
                );
            }
        } catch (IAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("La petición a Ollama fue interrumpida", e);
            throw new IAProviderException("La petición a Ollama fue interrumpida", e);
        } catch (Exception e) {
            log.error("Error inesperado al invocar Ollama: {}", e.getMessage(), e);
            throw new IAProviderException("Error al invocar Ollama: " + e.getMessage(), e);
        }
    }
}
