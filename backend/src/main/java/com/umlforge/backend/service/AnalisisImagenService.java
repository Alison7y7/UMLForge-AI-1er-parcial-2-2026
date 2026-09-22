package com.umlforge.backend.service;

import com.umlforge.backend.dto.AnalisisImagenResponse;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.entity.AnalisisImagen;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.EstadoAnalisis;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.AnalisisImagenRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ia.image.ImageIAProvider;
import com.umlforge.backend.service.ia.image.ImageIAProviderResult;
import com.umlforge.backend.service.ia.image.ImageUmlPromptFactory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
public class AnalisisImagenService {

    static final long MAX_FILE_SIZE = 10L * 1024L * 1024L;
    private static final List<String> SUPPORTED_MIME_TYPES = List.of(
            "image/png", "image/jpeg", "image/webp");

    private final List<ImageIAProvider> providers;
    private final AnalisisImagenRepository analisisImagenRepository;
    private final UsuarioRepository usuarioRepository;
    private final DiagramaService diagramaService;
    private final UmlModelValidator umlModelValidator;
    private final ObjectMapper objectMapper;

    public AnalisisImagenService(
            List<ImageIAProvider> providers,
            AnalisisImagenRepository analisisImagenRepository,
            UsuarioRepository usuarioRepository,
            DiagramaService diagramaService,
            UmlModelValidator umlModelValidator,
            ObjectMapper objectMapper) {
        this.providers = providers.stream()
                .sorted(Comparator.comparingInt(ImageIAProvider::getPriority))
                .toList();
        this.analisisImagenRepository = analisisImagenRepository;
        this.usuarioRepository = usuarioRepository;
        this.diagramaService = diagramaService;
        this.umlModelValidator = umlModelValidator;
        this.objectMapper = objectMapper;
    }

    public AnalisisImagenResponse reconstruir(
            MultipartFile archivo, Long diagramaId, String correoUsuario) {
        Usuario usuario = usuarioRepository.findByCorreo(correoUsuario)
                .orElseThrow(() -> new AnalisisImagenServiceException(
                        HttpStatus.UNAUTHORIZED, "Usuario autenticado no encontrado"));
        Diagrama diagrama = resolveDiagram(diagramaId, usuario);
        ValidatedImage validatedImage = validateAndRead(archivo);

        AnalisisImagen analysis = new AnalisisImagen();
        analysis.setUsuario(usuario);
        analysis.setProyecto(diagrama == null ? null : diagrama.getProyecto());
        analysis.setRutaImagen(buildImageReference(archivo.getOriginalFilename()));
        analysis.setEstado(EstadoAnalisis.SUBIDA);
        analysis = analisisImagenRepository.save(analysis);

        analysis.setEstado(EstadoAnalisis.PROCESANDO);
        analysis = analisisImagenRepository.save(analysis);

        List<String> errors = new ArrayList<>();
        try {
            for (ImageIAProvider provider : providers) {
                if (!provider.isAvailable()) {
                    log.info("Proveedor de imagen {} no disponible", provider.getName());
                    continue;
                }

                try {
                    ImageIAProviderResult result = provider.analyze(
                            validatedImage.bytes(), validatedImage.mimeType(), ImageUmlPromptFactory.build());
                    if (result == null) {
                        throw new IllegalArgumentException("El proveedor devolvio un resultado nulo");
                    }

                    UmlModelDto model = parseModel(result.content());
                    if (model.clases() == null || model.clases().isEmpty()) {
                        throw new IllegalArgumentException("El modelo reconstruido no contiene clases");
                    }
                    umlModelValidator.validate(model);

                    analysis.setResultadoJson(objectMapper.writeValueAsString(model));
                    analysis.setEstado(EstadoAnalisis.COMPLETADA);
                    analysis.setMensajeError(null);
                    analysis.setFechaProcesamiento(LocalDateTime.now());
                    AnalisisImagen saved = analisisImagenRepository.save(analysis);
                    return new AnalisisImagenResponse(
                            saved.getId(), provider.getName(), model, result.tokensUsed());
                } catch (Exception e) {
                    String message = safeMessage(e);
                    errors.add(provider.getName() + ": " + message);
                    log.warn("Proveedor de imagen {} descartado: {}", provider.getName(), message, e);
                }
            }

            String summary = errors.isEmpty()
                    ? "No hay proveedores de analisis de imagen disponibles"
                    : String.join("; ", errors);
            markAsError(analysis, summary);
            throw new AnalisisImagenServiceException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "No fue posible reconstruir el diagrama con los proveedores disponibles");
        } catch (AnalisisImagenServiceException e) {
            throw e;
        } catch (Exception e) {
            markAsError(analysis, safeMessage(e));
            throw new AnalisisImagenServiceException(
                    HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo completar el analisis de la imagen", e);
        }
    }

    private Diagrama resolveDiagram(Long diagramaId, Usuario usuario) {
        if (diagramaId == null) return null;
        try {
            return diagramaService.obtenerEntidadConAcceso(diagramaId, usuario);
        } catch (RuntimeException e) {
            throw new AnalisisImagenServiceException(HttpStatus.FORBIDDEN, e.getMessage(), e);
        }
    }

    private ValidatedImage validateAndRead(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AnalisisImagenServiceException(HttpStatus.BAD_REQUEST, "La imagen esta vacia");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new AnalisisImagenServiceException(
                    HttpStatus.PAYLOAD_TOO_LARGE, "La imagen supera el limite de 10 MB");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new AnalisisImagenServiceException(
                    HttpStatus.BAD_REQUEST, "No se pudo leer la imagen", e);
        }

        String declaredMime = file.getContentType() == null
                ? ""
                : file.getContentType().toLowerCase(Locale.ROOT).trim();
        String detectedMime = detectMimeType(bytes);
        if (!SUPPORTED_MIME_TYPES.contains(declaredMime) || !declaredMime.equals(detectedMime)) {
            throw new AnalisisImagenServiceException(
                    HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Formato no compatible. Use PNG, JPEG o WebP");
        }
        return new ValidatedImage(bytes, detectedMime);
    }

    private String detectMimeType(byte[] bytes) {
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e
                && bytes[3] == 0x47 && bytes[4] == 0x0d && bytes[5] == 0x0a
                && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return "image/png";
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }
        return "";
    }

    private UmlModelDto parseModel(String response) {
        if (response == null || response.isBlank()) {
            throw new IllegalArgumentException("El proveedor devolvio una respuesta vacia");
        }
        String json = extractJson(response.trim());
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode modelNode = root.has("modelo") ? root.get("modelo") : root;
            return objectMapper.treeToValue(modelNode, UmlModelDto.class);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("El proveedor no devolvio un UmlModelDto JSON valido", e);
        }
    }

    private String extractJson(String value) {
        if (value.startsWith("```")) {
            int firstLineEnd = value.indexOf('\n');
            int closingFence = value.lastIndexOf("```");
            if (firstLineEnd >= 0 && closingFence > firstLineEnd) {
                value = value.substring(firstLineEnd + 1, closingFence).trim();
            }
        }
        int objectStart = value.indexOf('{');
        int objectEnd = value.lastIndexOf('}');
        return objectStart >= 0 && objectEnd > objectStart
                ? value.substring(objectStart, objectEnd + 1)
                : value;
    }

    private void markAsError(AnalisisImagen analysis, String message) {
        analysis.setEstado(EstadoAnalisis.ERROR);
        analysis.setMensajeError(truncate(message, 255));
        analysis.setFechaProcesamiento(LocalDateTime.now());
        analisisImagenRepository.save(analysis);
    }

    private String buildImageReference(String originalFilename) {
        String safeName = originalFilename == null ? "imagen" : originalFilename
                .replace('\\', '_').replace('/', '_').replaceAll("[^a-zA-Z0-9._-]", "_");
        return truncate("upload:" + UUID.randomUUID() + ":" + safeName, 255);
    }

    private String truncate(String value, int maximumLength) {
        if (value == null || value.length() <= maximumLength) return value;
        return value.substring(0, maximumLength);
    }

    private String safeMessage(Throwable error) {
        return error.getMessage() == null || error.getMessage().isBlank()
                ? error.getClass().getSimpleName()
                : error.getMessage();
    }

    private record ValidatedImage(byte[] bytes, String mimeType) {}
}
