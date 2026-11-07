package com.umlforge.backend.config;

import com.umlforge.backend.service.ia.chat.ChatIAProvider;
import com.umlforge.backend.service.ia.chat.StructuredChatHttpProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class ChatIAProviderConfig {

    @Bean
    ChatIAProvider geminiChatIAProvider(ObjectMapper mapper,
            @Value("${ia.chat.gemini.enabled:${ia.gemini.enabled:true}}") boolean enabled,
            @Value("${ia.chat.gemini.api-key:${ia.gemini.api-key:}}") String key,
            @Value("${ia.chat.gemini.model:${ia.gemini.model:gemini-3.5-flash-lite}}") String model,
            @Value("${ia.chat.gemini.base-url:https://generativelanguage.googleapis.com}") String baseUrl,
            @Value("${ia.chat.gemini.timeout-seconds:45}") long timeout) {
        return new StructuredChatHttpProvider("gemini", 10, enabled, key, model, baseUrl,
                timeout, StructuredChatHttpProvider.Protocol.GEMINI, mapper);
    }

    @Bean
    ChatIAProvider groqChatIAProvider(ObjectMapper mapper,
            @Value("${ia.chat.groq.enabled:true}") boolean enabled,
            @Value("${ia.chat.groq.api-key:}") String key,
            @Value("${ia.chat.groq.model:openai/gpt-oss-120b}") String model,
            @Value("${ia.chat.groq.base-url:https://api.groq.com/openai/v1}") String baseUrl,
            @Value("${ia.chat.groq.timeout-seconds:45}") long timeout) {
        return new StructuredChatHttpProvider("groq", 20, enabled, key, model, baseUrl,
                timeout, StructuredChatHttpProvider.Protocol.OPENAI, mapper);
    }

    @Bean
    ChatIAProvider openRouterChatIAProvider(ObjectMapper mapper,
            @Value("${ia.chat.openrouter.enabled:true}") boolean enabled,
            @Value("${ia.chat.openrouter.api-key:}") String key,
            @Value("${ia.chat.openrouter.model:openai/gpt-oss-120b}") String model,
            @Value("${ia.chat.openrouter.base-url:https://openrouter.ai/api/v1}") String baseUrl,
            @Value("${ia.chat.openrouter.timeout-seconds:45}") long timeout) {
        return new StructuredChatHttpProvider("openrouter", 30, enabled, key, model, baseUrl,
                timeout, StructuredChatHttpProvider.Protocol.OPENROUTER, mapper);
    }

    @Bean
    ChatIAProvider ollamaChatIAProvider(ObjectMapper mapper,
            @Value("${ia.chat.ollama.enabled:${ia.ollama.enabled:true}}") boolean enabled,
            @Value("${ia.chat.ollama.model:${ia.ollama.model:qwen2.5:1.5b}}") String model,
            @Value("${ia.chat.ollama.base-url:${ia.ollama.base-url:http://localhost:11434}}") String baseUrl,
            @Value("${ia.chat.ollama.timeout-seconds:90}") long timeout) {
        return new StructuredChatHttpProvider("ollama", 40, enabled, "", model, baseUrl,
                timeout, StructuredChatHttpProvider.Protocol.OLLAMA, mapper);
    }
}
