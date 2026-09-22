package com.umlforge.backend.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.umlforge.backend.dto.IAModelRequest;
import com.umlforge.backend.dto.IAModelResponse;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.OrigenPeticion;
import com.umlforge.backend.entity.PeticionIA;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.PeticionIARepository;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ia.IAProvider;
import com.umlforge.backend.service.ia.IAProviderResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Slf4j
@Service
public class IAService {

    private final List<IAProvider> providers;
    private final UsuarioRepository usuarioRepository;
    private final PeticionIARepository peticionIARepository;
    private final DiagramaService diagramaService;
    private final UmlModelValidator umlModelValidator;
    private final ObjectMapper objectMapper;

    public IAService(
            List<IAProvider> providers,
            UsuarioRepository usuarioRepository,
            PeticionIARepository peticionIARepository,
            DiagramaService diagramaService,
            UmlModelValidator umlModelValidator,
            ObjectMapper objectMapper) {
        this.providers = providers.stream()
                .sorted(Comparator.comparingInt(IAProvider::getPriority))
                .toList();
        this.usuarioRepository = usuarioRepository;
        this.peticionIARepository = peticionIARepository;
        this.diagramaService = diagramaService;
        this.umlModelValidator = umlModelValidator;
        this.objectMapper = objectMapper;
    }

    public IAModelResponse modelar(IAModelRequest request, String correoUsuario) {
        Usuario usuario = usuarioRepository.findByCorreo(correoUsuario)
                .orElseThrow(() -> new IAServiceException("Usuario autenticado no encontrado"));
        Diagrama diagrama = request.diagramaId() == null
                ? null
                : diagramaService.obtenerEntidadConAcceso(request.diagramaId(), usuario);
        String providerPrompt = buildProviderPrompt(request.prompt().trim(), diagrama);
        List<String> errors = new ArrayList<>();
        IAProviderResult selectedResult = null;
        String selectedProvider = null;

        for (IAProvider provider : providers) {
            if (!provider.isAvailable()) {
                continue;
            }

            IAProviderResult result;
            try {
                result = provider.generate(providerPrompt);
            } catch (RuntimeException e) {
                errors.add(provider.getName() + ": " + safeMessage(e));
                log.warn("Proveedor IA {} falló durante la generación: {}", provider.getName(), safeMessage(e));
                continue;
            }

            try {
                if (result == null) {
                    throw new IllegalArgumentException("El proveedor devolvió un resultado nulo");
                }
                umlModelValidator.validate(result.model());
                selectedResult = result;
                selectedProvider = provider.getName();
                break;
            } catch (IllegalArgumentException e) {
                errors.add(provider.getName() + ": " + safeMessage(e));
                log.warn("El resultado de {} no cumple UmlModelDto y será descartado: {}",
                        provider.getName(), safeMessage(e), e);
            }
        }

        if (selectedResult != null) {
            PeticionIA saved = saveRequest(
                    usuario, diagrama, request.prompt().trim(), selectedResult, selectedProvider, true, null
            );
            return new IAModelResponse(
                    saved.getId(), selectedProvider, selectedResult.model(), selectedResult.tokensUsed()
            );
        }

        String errorSummary = errors.isEmpty()
                ? "No hay proveedores de IA habilitados"
                : String.join("; ", errors);
        saveRequest(usuario, diagrama, request.prompt().trim(), null, null, false, errorSummary);
        throw new IAServiceException("No fue posible generar el modelo UML con los proveedores disponibles");
    }

    private PeticionIA saveRequest(
            Usuario usuario,
            Diagrama diagrama,
            String prompt,
            IAProviderResult result,
            String provider,
            boolean successful,
            String error) {
        PeticionIA request = new PeticionIA();
        request.setUsuario(usuario);
        request.setDiagrama(diagrama);
        request.setPromptTexto(prompt);
        request.setOrigen(OrigenPeticion.TEXTO_WEB);
        request.setExitoso(successful);
        request.setTokensUsados(result != null ? result.tokensUsed() : null);
        request.setResultadoJson(result != null
                ? serializeResult(result, provider)
                : serializeError(error));
        return peticionIARepository.save(request);
    }

    private String serializeResult(IAProviderResult result, String provider) {
        try {
            var root = objectMapper.createObjectNode();
            root.put("proveedor", provider);
            root.set("modelo", objectMapper.valueToTree(result.model()));
            return objectMapper.writeValueAsString(root);
        } catch (JacksonException e) {
            throw new IAServiceException("No se pudo serializar el resultado UML", e);
        }
    }

    private String serializeError(String error) {
        try {
            return objectMapper.writeValueAsString(objectMapper.createObjectNode().put("error", error));
        } catch (JacksonException e) {
            return "{\"error\":\"Error de generación\"}";
        }
    }

    private String safeMessage(Throwable error) {
        return error.getMessage() == null || error.getMessage().isBlank()
                ? error.getClass().getSimpleName()
                : error.getMessage();
    }

    private String buildProviderPrompt(String userPrompt, Diagrama diagrama) {
        if (diagrama == null || diagrama.getModeloJson() == null || diagrama.getModeloJson().isBlank()) {
            return userPrompt;
        }

        return """
                Modifica o amplía el modelo UML existente de acuerdo con la nueva solicitud.
                Conserva las clases y relaciones existentes que no entren en conflicto con la solicitud.

                MODELO UML EXISTENTE:
                %s

                NUEVA SOLICITUD DEL USUARIO:
                %s
                """.formatted(diagrama.getModeloJson(), userPrompt);
    }
}
