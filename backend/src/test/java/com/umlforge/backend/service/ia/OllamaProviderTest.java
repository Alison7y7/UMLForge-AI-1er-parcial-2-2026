package com.umlforge.backend.service.ia;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.umlforge.backend.service.UmlModelValidator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OllamaProviderTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendsJsonFormatAndParsesAValidUmlResponse() throws Exception {
        AtomicReference<String> method = new AtomicReference<>();
        AtomicReference<String> path = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = startServer(exchange -> {
            method.set(exchange.getRequestMethod());
            path.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, validOllamaResponse());
        });

        OllamaProvider provider = provider(5);
        IAProviderResult result = provider.generate(
                "Crear exactamente las clases Cliente y Pedido con una relación uno a muchos"
        );

        JsonNode sent = objectMapper.readTree(requestBody.get());
        assertThat(method.get()).isEqualTo("POST");
        assertThat(path.get()).isEqualTo("/api/generate");
        assertThat(sent.path("model").asText()).isEqualTo("qwen2.5:1.5b");
        assertThat(sent.path("stream").asBoolean()).isFalse();
        assertThat(sent.path("format").asText()).isEqualTo("json");
        assertThat(sent.path("keep_alive").asText()).isEqualTo("10m");
        assertThat(sent.path("options").path("num_ctx").asInt()).isEqualTo(3072);
        assertThat(sent.path("options").path("num_predict").asInt()).isEqualTo(1200);
        assertThat(sent.path("options").path("temperature").asDouble()).isEqualTo(0.0);
        assertThat(sent.path("prompt").asText())
                .contains("Crear exactamente las clases Cliente y Pedido")
                .contains("Una relación UML va solo en relaciones")
                .contains("posicionX y posicionY son números JSON obligatorios");

        new UmlModelValidator().validate(result.model());
        assertThat(result.model().clases()).extracting("nombre")
                .containsExactly("Cliente", "Pedido");
        assertThat(result.model().relaciones()).hasSize(1);
        assertThat(result.model().relaciones().get(0))
                .extracting("origen", "destino", "tipo", "multiplicidadOrigen", "multiplicidadDestino")
                .containsExactly("clase-cliente", "clase-pedido", "ASOCIACION", "1", "0..*");
        assertThat(result.tokensUsed()).isEqualTo(37);
    }

    @Test
    void exposesOllamaHttpErrors() throws Exception {
        server = startServer(exchange -> respond(exchange, 503, "{\"error\":\"model unavailable\"}"));

        assertThatThrownBy(() -> provider(5).generate("Crear un modelo"))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("Estado 503")
                .hasMessageContaining("model unavailable");
    }

    @Test
    void reportsRequestTimeouts() throws Exception {
        server = startServer(exchange -> {
            try {
                Thread.sleep(1_500);
                respond(exchange, 200, validOllamaResponse());
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            } catch (IOException ignored) {
                // The client is expected to close the exchange after its timeout.
            }
        });

        assertThatThrownBy(() -> provider(1).generate("Crear un modelo"))
                .isInstanceOf(IAProviderException.class)
                .hasMessageContaining("Error al invocar Ollama")
                .hasCauseInstanceOf(HttpTimeoutException.class);
    }

    private OllamaProvider provider(long timeoutSeconds) {
        return new OllamaProvider(
                objectMapper,
                true,
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "qwen2.5:1.5b",
                timeoutSeconds,
                3072,
                1200,
                0.0,
                "10m"
        );
    }

    private HttpServer startServer(ExchangeHandler handler) throws IOException {
        HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        httpServer.createContext("/api/generate", exchange -> handler.handle(exchange));
        httpServer.start();
        return httpServer;
    }

    private String validOllamaResponse() throws IOException {
        String model = """
                {
                  "clases": [
                    {
                      "id": "clase-cliente",
                      "nombre": "Cliente",
                      "estereotipo": "entity",
                      "posicionX": 100.0,
                      "posicionY": 100.0,
                      "atributos": [{
                        "id": "atributo-cliente-id",
                        "nombre": "id",
                        "tipo": "Long",
                        "visibilidad": "private"
                      }],
                      "metodos": []
                    },
                    {
                      "id": "clase-pedido",
                      "nombre": "Pedido",
                      "estereotipo": "entity",
                      "posicionX": 400.0,
                      "posicionY": 100.0,
                      "atributos": [{
                        "id": "atributo-pedido-id",
                        "nombre": "id",
                        "tipo": "Long",
                        "visibilidad": "private"
                      }],
                      "metodos": []
                    }
                  ],
                  "relaciones": [{
                    "id": "relacion-cliente-pedidos",
                    "origen": "clase-cliente",
                    "destino": "clase-pedido",
                    "tipo": "ASOCIACION",
                    "nombre": "pedidos",
                    "multiplicidadOrigen": "1",
                    "multiplicidadDestino": "0..*"
                  }]
                }
                """;
        var response = objectMapper.createObjectNode();
        response.put("response", model);
        response.put("eval_count", 37);
        response.put("done", true);
        return objectMapper.writeValueAsString(response);
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
