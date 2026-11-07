package com.umlforge.backend.service.ia.chat;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StructuredChatHttpProviderTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) server.stop(0);
    }

    @Test
    void proveedorOpenAiUsaChatCompletionsBearerYExtraeRespuesta() throws Exception {
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        startServer("/v1/chat/completions", exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"{\\\"respuesta\\\":\\\"ok\\\",\\\"recomendaciones\\\":[]}\"}}],\"usage\":{\"total_tokens\":17}}");
        });
        var provider = provider("groq", "test-key", "openai/gpt-oss-120b", "/v1",
                StructuredChatHttpProvider.Protocol.OPENAI);

        ChatIAProviderResult result = provider.generate("contexto UML");

        assertThat(authorization.get()).isEqualTo("Bearer test-key");
        assertThat(requestBody.get()).contains("\"model\":\"openai/gpt-oss-120b\"")
                .contains("contexto UML");
        assertThat(result.tokensUsed()).isEqualTo(17);
        assertThat(result.structuredJson()).contains("\"respuesta\":\"ok\"");
    }

    @Test
    void openRouterExigeFormatoJsonYProveedorCompatible() throws Exception {
        AtomicReference<String> authorization = new AtomicReference<>();
        AtomicReference<String> requestBody = new AtomicReference<>();
        startServer("/api/v1/chat/completions", exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, "{\"choices\":[{\"message\":{\"content\":\"{\\\"respuesta\\\":\\\"ok\\\",\\\"recomendaciones\\\":[]}\"}}],\"usage\":{\"total_tokens\":11}}");
        });
        var provider = provider("openrouter", "test-key", "openai/gpt-oss-120b", "/api/v1",
                StructuredChatHttpProvider.Protocol.OPENROUTER);

        ChatIAProviderResult result = provider.generate("contexto UML");

        assertThat(authorization.get()).isEqualTo("Bearer test-key");
        assertThat(requestBody.get()).contains("\"response_format\":{\"type\":\"json_object\"}")
                .contains("\"provider\":{\"require_parameters\":true}")
                .contains("\"model\":\"openai/gpt-oss-120b\"");
        assertThat(result.tokensUsed()).isEqualTo(11);
    }

    @Test
    void openRouterSinClaveSeOmiteSinRealizarSolicitud() {
        var provider = new StructuredChatHttpProvider("openrouter", 30, true, "",
                "openai/gpt-oss-120b", "https://openrouter.ai/api/v1", 45,
                StructuredChatHttpProvider.Protocol.OPENROUTER, mapper);

        assertThat(provider.isAvailable()).isFalse();
        assertThat(provider.getUnavailableReason()).isEqualTo("API key no configurada");
    }

    @Test
    void geminiUsaHeaderSeguroYEndpointGenerateContent() throws Exception {
        AtomicReference<String> apiKey = new AtomicReference<>();
        startServer("/v1beta/models/gemini-3.5-flash-lite:generateContent", exchange -> {
            apiKey.set(exchange.getRequestHeaders().getFirst("x-goog-api-key"));
            respond(exchange, 200, "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"respuesta\\\":\\\"ok\\\",\\\"recomendaciones\\\":[]}\"}]}}],\"usageMetadata\":{\"totalTokenCount\":9}}");
        });
        var provider = provider("gemini", "test-key", "gemini-3.5-flash-lite", "",
                StructuredChatHttpProvider.Protocol.GEMINI);

        assertThat(provider.generate("UML").tokensUsed()).isEqualTo(9);
        assertThat(apiKey.get()).isEqualTo("test-key");
    }

    @Test
    void ollamaNoRequiereCredencialYUsaApiChat() throws Exception {
        startServer("/api/chat", exchange -> respond(exchange, 200,
                "{\"message\":{\"content\":\"{\\\"respuesta\\\":\\\"ok\\\",\\\"recomendaciones\\\":[]}\"},\"prompt_eval_count\":4,\"eval_count\":6}"));
        var provider = provider("ollama", "", "qwen2.5:1.5b", "",
                StructuredChatHttpProvider.Protocol.OLLAMA);

        assertThat(provider.isAvailable()).isTrue();
        assertThat(provider.generate("UML").tokensUsed()).isEqualTo(10);
    }

    @Test
    void proveedorRemotoSinClaveSeOmiteYErrorHttpNoExponeLaClave() throws Exception {
        var missing = new StructuredChatHttpProvider("groq", 20, true, "", "model",
                "http://localhost", 2, StructuredChatHttpProvider.Protocol.OPENAI, mapper);
        assertThat(missing.isAvailable()).isFalse();
        assertThat(missing.getUnavailableReason()).isEqualTo("API key no configurada");

        startServer("/v1/chat/completions", exchange -> respond(exchange, 401,
                "detalle potencialmente sensible"));
        String secret = "secret-that-must-not-leak";
        var configured = provider("groq", secret, "model", "/v1",
                StructuredChatHttpProvider.Protocol.OPENAI);
        assertThatThrownBy(() -> configured.generate("UML"))
                .isInstanceOf(ChatIAProviderException.class)
                .hasMessageNotContaining(secret)
                .hasMessageNotContaining("detalle potencialmente sensible")
                .hasMessageContaining("estado 401");
    }

    private StructuredChatHttpProvider provider(String name, String key, String model,
            String suffix, StructuredChatHttpProvider.Protocol protocol) {
        return new StructuredChatHttpProvider(name, 10, true, key, model,
                "http://127.0.0.1:" + server.getAddress().getPort() + suffix,
                2, protocol, mapper);
    }

    private void startServer(String path, Handler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(path, exchange -> handler.handle(exchange));
        server.start();
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @FunctionalInterface
    private interface Handler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
