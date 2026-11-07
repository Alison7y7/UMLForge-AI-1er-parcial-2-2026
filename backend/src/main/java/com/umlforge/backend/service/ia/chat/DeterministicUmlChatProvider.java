package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.service.ia.FallbackUmlProvider;
import com.umlforge.backend.service.ia.IAProviderException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.util.stream.Collectors;
import java.text.Normalizer;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DeterministicUmlChatProvider implements ChatIAProvider {

    private final FallbackUmlProvider fallbackUmlProvider;
    private final ObjectMapper objectMapper;

    @Override public String getName() { return "motor-determinista-uml"; }
    @Override public int getPriority() { return 100; }
    @Override public boolean isAvailable() { return true; }
    @Override public String getUnavailableReason() { return ""; }

    @Override
    public ChatIAProviderResult generate(String prompt) {
        if (!isDirectUmlInstruction(prompt)) {
            throw new ChatIAProviderException(
                    "El motor determinista no admite esta consulta conversacional");
        }
        try {
            UmlModelDto model = fallbackUmlProvider.generate(prompt).model();
            String classes = model.clases().stream().map(UmlModelDto.UmlClass::nombre)
                    .collect(Collectors.joining(", "));
            var root = objectMapper.createObjectNode();
            root.put("respuesta", "El motor determinista generó un borrador UML compatible con la instrucción. "
                    + "Clases: " + classes + ". Relaciones: " + model.relaciones().size()
                    + ". Revísalo antes de incorporarlo; no se aplicó ningún cambio al diagrama.");
            root.set("recomendaciones", objectMapper.createArrayNode());
            return new ChatIAProviderResult(objectMapper.writeValueAsString(root), 0);
        } catch (IAProviderException e) {
            throw new ChatIAProviderException(
                    "El motor determinista no admite esta consulta conversacional", e);
        } catch (JacksonException e) {
            throw new ChatIAProviderException("No se pudo serializar el resultado determinista", e);
        }
    }

    private boolean isDirectUmlInstruction(String prompt) {
        String request = extractUserRequest(prompt);
        String normalized = Normalizer.normalize(request, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .trim()
                .toLowerCase(Locale.ROOT);
        if (normalized.isBlank() || normalized.contains("?")
                || normalized.matches("^(como|que|cual|cuales|por que|cuando|donde|quien)\\b.*")) {
            return false;
        }
        return normalized.matches("^(crea|crear|genera|generar|modela|modelar|disena|disenar|haz|construye|construir)\\b.*");
    }

    private String extractUserRequest(String prompt) {
        if (prompt == null) return "";
        String marker = "NUEVA SOLICITUD DEL USUARIO:";
        int markerIndex = prompt.lastIndexOf(marker);
        return markerIndex >= 0 ? prompt.substring(markerIndex + marker.length()).trim() : prompt.trim();
    }
}
