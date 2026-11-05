package com.umlforge.backend.service.ia.image;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiVisionProviderTest {

    private static final String TEST_API_KEY = "vision-test-key-never-sent-to-google";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void sendsImageWithHeaderAndStructuredUmlSchema() throws Exception {
        AtomicReference<String> path = new AtomicReference<>();
        AtomicReference<String> query = new AtomicReference<>();
        AtomicReference<String> apiKeyHeader = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = startServer(exchange -> {
            path.set(exchange.getRequestURI().getPath());
            query.set(exchange.getRequestURI().getQuery());
            apiKeyHeader.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, geminiEnvelope(validAssociationClassModel(), 42));
        });

        byte[] image = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x01};
        ImageIAProviderResult result = provider().analyze(image, "image/jpeg", "prompt CU9");

        assertThat(path.get()).isEqualTo(
                "/v1beta/models/gemini-3.5-flash-lite:generateContent");
        assertThat(query.get()).isNull();
        assertThat(apiKeyHeader.get()).isEqualTo(TEST_API_KEY);

        JsonNode sent = objectMapper.readTree(requestBody.get());
        assertThat(sent.path("contents").path(0).path("parts").path(0).path("text").asText())
                .isEqualTo("prompt CU9");
        assertThat(sent.path("contents").path(0).path("parts").path(1)
                .path("inline_data").path("mime_type").asText()).isEqualTo("image/jpeg");
        assertThat(sent.path("contents").path(0).path("parts").path(1)
                .path("inline_data").path("data").asText())
                .isEqualTo(Base64.getEncoder().encodeToString(image));

        JsonNode schema = sent.path("generationConfig").path("responseSchema");
        assertThat(schema.path("required").toString())
                .contains("advertencias", "clases", "relaciones");
        JsonNode relationProperties = schema.path("properties").path("relaciones")
                .path("items").path("properties");
        assertThat(relationProperties.has("claseAsociacion")).isTrue();
        assertThat(relationProperties.has("rolOrigen")).isTrue();
        JsonNode attributeSchema = schema.path("properties").path("clases")
                .path("items").path("properties").path("atributos").path("items");
        assertThat(attributeSchema.path("required").toString()).contains("origenTipo");
        assertThat(attributeSchema.path("properties").path("origenTipo").path("enum").toString())
                .contains("IMAGEN", "SUGERIDO", "INDETERMINADO")
                .doesNotContain("USUARIO");
        assertThat(relationProperties.has("rolDestino")).isTrue();
        assertThat(result.content()).contains("claseAsociacion", "detalle");
        assertThat(result.tokensUsed()).isEqualTo(42);
    }

    @Test
    void reportsHttpErrorWithoutLeakingBodyOrApiKey() throws Exception {
        server = startServer(exchange -> respond(
                exchange, 403, "{\"error\":{\"message\":\"sensitive upstream detail\"}}"));

        assertThatThrownBy(() -> provider().analyze(
                new byte[]{1}, "image/jpeg", "prompt"))
                .isInstanceOf(ImageIAProviderException.class)
                .hasMessageContaining("estado 403")
                .hasMessageContaining("autenticacion o permisos rechazados")
                .hasMessageNotContaining("sensitive upstream detail")
                .hasMessageNotContaining(TEST_API_KEY);
    }

    @Test
    void rejectsInvalidModelNameBeforeAnyRequest() {
        GeminiVisionProvider provider = new GeminiVisionProvider(
                objectMapper, true, TEST_API_KEY, "../../invalid", 5,
                HttpClient.newHttpClient(), "http://127.0.0.1");

        assertThat(provider.isAvailable()).isFalse();
    }

    private GeminiVisionProvider provider() {
        return new GeminiVisionProvider(
                objectMapper,
                true,
                TEST_API_KEY,
                "gemini-3.5-flash-lite",
                5,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build(),
                "http://127.0.0.1:" + server.getAddress().getPort());
    }

    private HttpServer startServer(ExchangeHandler handler) throws IOException {
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/v1beta/models", exchange -> handler.handle(exchange));
        httpServer.start();
        return httpServer;
    }

    private String validAssociationClassModel() {
        return """
                {
                  "advertencias": ["Multiplicidad de Producto pendiente de revision"],
                  "clases": [
                    {"id":"venta","nombre":"Venta","estereotipo":"","posicionX":100,"posicionY":100,"atributos":[],"metodos":[]},
                    {"id":"producto","nombre":"Producto","estereotipo":"","posicionX":400,"posicionY":100,"atributos":[],"metodos":[]},
                    {"id":"detalle","nombre":"Detalle","estereotipo":"","posicionX":250,"posicionY":300,"atributos":[],"metodos":[]}
                  ],
                  "relaciones": [{
                    "id":"venta-producto","origen":"venta","destino":"producto",
                    "tipo":"ASOCIACION","nombre":"","multiplicidadOrigen":"1",
                    "multiplicidadDestino":"","rolOrigen":"","rolDestino":"",
                    "claseAsociacion":"detalle"
                  }]
                }
                """;
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
