package com.umlforge.backend.service.ia;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.umlforge.backend.service.UmlModelValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiProviderTest {

    private static final String TEST_API_KEY = "test-key-never-sent-to-google";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendsStructuredJsonRequestAndParsesValidResponse() throws Exception {
        AtomicReference<String> path = new AtomicReference<>();
        AtomicReference<String> query = new AtomicReference<>();
        AtomicReference<String> apiKeyHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = startServer(exchange -> {
            path.set(exchange.getRequestURI().getPath());
            query.set(exchange.getRequestURI().getQuery());
            apiKeyHeader.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            requestBody.set(new String(
                    exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, validGeminiResponse());
        });

        IAProviderResult result = provider().generate("Crear una clase Cliente");

        assertThat(path.get())
                .isEqualTo("/v1beta/models/gemini-3.5-flash-lite:generateContent");
        assertThat(query.get()).isNull();
        assertThat(apiKeyHeader.get()).isEqualTo(TEST_API_KEY);

        JsonNode sent = objectMapper.readTree(requestBody.get());
        assertThat(sent.path("contents").path(0).path("parts").path(0).path("text").asText())
                .contains("Crear una clase Cliente");
        assertThat(sent.path("generationConfig").path("responseMimeType").asText())
                .isEqualTo("application/json");
        JsonNode schema = sent.path("generationConfig").path("responseSchema");
        assertThat(schema.path("type").asText()).isEqualTo("OBJECT");
        assertThat(schema.path("required").toString()).contains("clases", "relaciones");
        assertThat(schema.path("properties").path("clases").path("items")
                .path("properties").path("posicionX").path("type").asText())
                .isEqualTo("NUMBER");

        new UmlModelValidator().validate(result.model());
        assertThat(result.model().clases()).singleElement()
                .extracting("id", "nombre")
                .containsExactly("clase-cliente", "Cliente");
        assertThat(result.tokensUsed()).isEqualTo(31);
    }

    @Test
    void rejectsInvalidGeneratedJson() throws Exception {
        server = startServer(exchange -> respond(
                exchange, 200, geminiEnvelope("esto no es JSON", 4)));

        assertThatThrownBy(() -> provider().generate("Crear una clase"))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("JSON válido");
    }

    @ParameterizedTest
    @CsvSource({
            "400, solicitud inválida",
            "401, autenticación o permisos rechazados",
            "404, modelo o endpoint no disponible",
            "429, límite de solicitudes excedido",
            "503, servicio temporalmente no disponible"
    })
    void reportsHttpErrorsWithoutExposingResponseBody(int status, String expectedDetail)
            throws Exception {
        server = startServer(exchange -> respond(
                exchange, status, "{\"error\":{\"message\":\"sensitive upstream detail\"}}"));

        assertThatThrownBy(() -> provider().generate("Crear una clase"))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("estado " + status)
                .hasMessageContaining(expectedDetail)
                .hasMessageNotContaining("sensitive upstream detail")
                .hasMessageNotContaining(TEST_API_KEY);
    }

    @Test
    void reportsMissingApiKeyWithoutExposingItsValue() {
        GeminiProvider provider = new GeminiProvider(
                objectMapper, true, "", "gemini-3.5-flash-lite", 5,
                HttpClient.newHttpClient(), "http://127.0.0.1"
        );

        assertThat(provider.isAvailable()).isFalse();
        assertThat(provider.getUnavailableReason())
                .isEqualTo("API key no configurada")
                .doesNotContain(TEST_API_KEY);
    }

    @Test
    void geminiPriorityPrecedesOllamaAndLocalTemplate() {
        GeminiProvider gemini = new GeminiProvider(
                objectMapper, true, TEST_API_KEY, "gemini-3.5-flash-lite", 45
        );
        OllamaProvider ollama = new OllamaProvider(
                objectMapper, true, "http://localhost:11434", "qwen2.5:1.5b",
                90, 3072, 1200, 0.0, "10m"
        );

        assertThat(gemini.getPriority()).isLessThan(ollama.getPriority());
        assertThat(ollama.getPriority()).isLessThan(new FallbackUmlProvider().getPriority());
    }

    private GeminiProvider provider() {
        return new GeminiProvider(
                objectMapper,
                true,
                TEST_API_KEY,
                "gemini-3.5-flash-lite",
                5,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build(),
                "http://127.0.0.1:" + server.getAddress().getPort()
        );
    }

    private HttpServer startServer(ExchangeHandler handler) throws IOException {
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/v1beta/models", exchange -> handler.handle(exchange));
        httpServer.start();
        return httpServer;
    }

    private String validGeminiResponse() throws IOException {
        String model = """
                {
                  "clases": [{
                    "id": "clase-cliente",
                    "nombre": "Cliente",
                    "estereotipo": "entity",
                    "posicionX": 100.0,
                    "posicionY": 100.0,
                    "atributos": [],
                    "metodos": []
                  }],
                  "relaciones": []
                }
                """;
        return geminiEnvelope(model, 31);
    }

    private String geminiEnvelope(String generated, int tokens) throws IOException {
        var text = objectMapper.createObjectNode().put("text", generated);
        var parts = objectMapper.createArrayNode().add(text);
        var content = objectMapper.createObjectNode().set("parts", parts);
        var candidate = objectMapper.createObjectNode().set("content", content);
        var root = objectMapper.createObjectNode();
        root.set("candidates", objectMapper.createArrayNode().add(candidate));
        root.set("usageMetadata", objectMapper.createObjectNode().put("totalTokenCount", tokens));
        return objectMapper.writeValueAsString(root);
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
