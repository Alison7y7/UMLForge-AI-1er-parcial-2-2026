package com.umlforge.backend.service.ia.chat;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public class StructuredChatHttpProvider implements ChatIAProvider {

    public enum Protocol { GEMINI, OPENAI, OPENROUTER, OLLAMA }

    private final String name;
    private final int priority;
    private final boolean enabled;
    private final String apiKey;
    private final String model;
    private final String baseUrl;
    private final Duration timeout;
    private final Protocol protocol;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public StructuredChatHttpProvider(String name, int priority, boolean enabled,
            String apiKey, String model, String baseUrl, long timeoutSeconds,
            Protocol protocol, ObjectMapper objectMapper) {
        this(name, priority, enabled, apiKey, model, baseUrl, timeoutSeconds, protocol,
                objectMapper, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
    }

    StructuredChatHttpProvider(String name, int priority, boolean enabled,
            String apiKey, String model, String baseUrl, long timeoutSeconds,
            Protocol protocol, ObjectMapper objectMapper, HttpClient httpClient) {
        this.name = name;
        this.priority = priority;
        this.enabled = enabled;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model == null ? "" : model.trim();
        this.baseUrl = baseUrl == null ? "" : baseUrl.trim().replaceAll("/+$", "");
        this.timeout = Duration.ofSeconds(timeoutSeconds);
        this.protocol = protocol;
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
    }

    @Override public String getName() { return name; }
    @Override public int getPriority() { return priority; }

    @Override
    public boolean isAvailable() {
        return enabled && !model.isBlank() && !baseUrl.isBlank()
                && (protocol == Protocol.OLLAMA || !apiKey.isBlank());
    }

    @Override
    public String getUnavailableReason() {
        if (!enabled) return "proveedor deshabilitado";
        if (model.isBlank()) return "modelo no configurado";
        if (baseUrl.isBlank()) return "URL base no configurada";
        if (protocol != Protocol.OLLAMA && apiKey.isBlank()) return "API key no configurada";
        return "configuración no válida";
    }

    @Override
    public ChatIAProviderResult generate(String prompt) {
        try {
            HttpRequest request = buildRequest(prompt);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ChatIAProviderException(name + " respondió con estado " + response.statusCode());
            }
            JsonNode root = objectMapper.readTree(response.body());
            return extract(root);
        } catch (ChatIAProviderException e) {
            throw e;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ChatIAProviderException("La solicitud a " + name + " fue interrumpida", e);
        } catch (Exception e) {
            throw new ChatIAProviderException("No se pudo consultar " + name + ": " + safe(e), e);
        }
    }

    private HttpRequest buildRequest(String prompt) throws Exception {
        var body = objectMapper.createObjectNode();
        String endpoint;
        HttpRequest.Builder builder;
        if (protocol == Protocol.GEMINI) {
            var part = objectMapper.createObjectNode().put("text", prompt);
            var content = objectMapper.createObjectNode();
            content.set("parts", objectMapper.createArrayNode().add(part));
            body.set("contents", objectMapper.createArrayNode().add(content));
            body.set("generationConfig", objectMapper.createObjectNode()
                    .put("responseMimeType", "application/json")
                    .put("temperature", 0.1));
            endpoint = baseUrl + "/v1beta/models/"
                    + URLEncoder.encode(model, StandardCharsets.UTF_8) + ":generateContent";
            builder = HttpRequest.newBuilder().header("x-goog-api-key", apiKey);
        } else if (protocol == Protocol.OPENAI || protocol == Protocol.OPENROUTER) {
            body.put("model", model);
            var message = objectMapper.createObjectNode().put("role", "user").put("content", prompt);
            body.set("messages", objectMapper.createArrayNode().add(message));
            body.put("temperature", 0.1);
            if (protocol == Protocol.OPENROUTER) {
                body.set("response_format", objectMapper.createObjectNode().put("type", "json_object"));
                body.set("provider", objectMapper.createObjectNode().put("require_parameters", true));
            }
            endpoint = baseUrl.endsWith("/chat/completions") ? baseUrl : baseUrl + "/chat/completions";
            builder = HttpRequest.newBuilder().header("Authorization", "Bearer " + apiKey);
        } else {
            body.put("model", model);
            body.put("stream", false);
            body.put("format", "json");
            var message = objectMapper.createObjectNode().put("role", "user").put("content", prompt);
            body.set("messages", objectMapper.createArrayNode().add(message));
            endpoint = baseUrl.endsWith("/api/chat") ? baseUrl : baseUrl + "/api/chat";
            builder = HttpRequest.newBuilder();
        }
        return builder.uri(URI.create(endpoint)).timeout(timeout)
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body), StandardCharsets.UTF_8))
                .build();
    }

    private ChatIAProviderResult extract(JsonNode root) {
        JsonNode text;
        Integer tokens;
        if (protocol == Protocol.GEMINI) {
            text = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
            JsonNode usage = root.path("usageMetadata").path("totalTokenCount");
            tokens = usage.isNumber() ? usage.asInt() : null;
        } else if (protocol == Protocol.OPENAI || protocol == Protocol.OPENROUTER) {
            text = root.path("choices").path(0).path("message").path("content");
            JsonNode usage = root.path("usage").path("total_tokens");
            tokens = usage.isNumber() ? usage.asInt() : null;
        } else {
            text = root.path("message").path("content");
            int total = root.path("prompt_eval_count").asInt(0) + root.path("eval_count").asInt(0);
            tokens = total == 0 ? null : total;
        }
        if (!text.isTextual() || text.asText().isBlank()) {
            throw new ChatIAProviderException(name + " devolvió una respuesta vacía");
        }
        return new ChatIAProviderResult(text.asText(), tokens);
    }

    private String safe(Exception error) {
        return error.getMessage() == null ? error.getClass().getSimpleName() : error.getMessage();
    }
}
