package com.umlforge.backend.service;

import com.umlforge.backend.entity.AdjuntoChatProyecto;
import com.umlforge.backend.entity.CategoriaAdjuntoChat;
import com.umlforge.backend.entity.Proyecto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE;

@Service
public class ChatAttachmentStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "png", "jpg", "jpeg", "webp", "pdf", "txt", "docx",
            "json", "xml", "xmi", "webm", "ogg", "m4a", "mp4");

    private final Path root;
    private final long maxFileBytes;
    private final ObjectMapper objectMapper;

    public ChatAttachmentStorageService(
            @Value("${chat.attachments.storage-path:./data/chat-attachments}") String storagePath,
            @Value("${chat.attachments.max-file-bytes:10485760}") long maxFileBytes,
            ObjectMapper objectMapper) {
        this.root = Path.of(storagePath).toAbsolutePath().normalize();
        this.maxFileBytes = maxFileBytes;
        this.objectMapper = objectMapper;
        try {
            Files.createDirectories(root.resolve("tmp"));
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo inicializar el almacenamiento privado del chat", e);
        }
    }

    public PreparedAttachment prepare(MultipartFile file, Proyecto proyecto) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "El archivo adjunto esta vacio");
        }
        if (file.getSize() > maxFileBytes) {
            throw new ResponseStatusException(PAYLOAD_TOO_LARGE,
                    "El archivo supera el limite de " + maxFileBytes + " bytes");
        }

        String originalName = sanitizeFilename(file.getOriginalFilename());
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ResponseStatusException(BAD_REQUEST, "Tipo de archivo no permitido: ." + extension);
        }

        try {
            byte[] bytes = file.getBytes();
            DetectedFile detected = detectAndValidate(extension, bytes);
            String id = UUID.randomUUID().toString();
            String storageKey = proyecto.getId() + "/" + id;
            Path finalPath = safeResolve(storageKey);
            Files.createDirectories(finalPath.getParent());
            Path tempPath = root.resolve("tmp").resolve(id + ".part").normalize();
            Files.write(tempPath, bytes);

            AdjuntoChatProyecto entity = new AdjuntoChatProyecto();
            entity.setId(id);
            entity.setProyecto(proyecto);
            entity.setNombreOriginal(originalName);
            entity.setStorageKey(storageKey);
            entity.setMimeType(detected.mimeType());
            entity.setCategoria(detected.category());
            entity.setTamanoBytes((long) bytes.length);
            entity.setSha256(sha256(bytes));
            return new PreparedAttachment(entity, tempPath, finalPath);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar el archivo adjunto", e);
        }
    }

    public void commit(PreparedAttachment prepared) {
        try {
            try {
                Files.move(prepared.tempPath(), prepared.finalPath(),
                        StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException e) {
                Files.move(prepared.tempPath(), prepared.finalPath(), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            cleanup(prepared);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo confirmar el archivo adjunto", e);
        }
    }

    public void cleanup(PreparedAttachment prepared) {
        try { Files.deleteIfExists(prepared.tempPath()); } catch (IOException ignored) { }
        try { Files.deleteIfExists(prepared.finalPath()); } catch (IOException ignored) { }
    }

    public Resource load(AdjuntoChatProyecto attachment) {
        Path path = safeResolve(attachment.getStorageKey());
        if (!Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Archivo adjunto no encontrado");
        }
        return new FileSystemResource(path);
    }

    public long getMaxFileBytes() { return maxFileBytes; }

    private Path safeResolve(String storageKey) {
        Path resolved = root.resolve(storageKey).normalize();
        if (!resolved.startsWith(root)) {
            throw new ResponseStatusException(BAD_REQUEST, "Ruta de almacenamiento invalida");
        }
        return resolved;
    }

    private String sanitizeFilename(String filename) {
        String value = filename == null ? "archivo" : filename.replace('\\', '/');
        value = value.substring(value.lastIndexOf('/') + 1).trim();
        value = value.replaceAll("[\\p{Cntrl}]", "").replaceAll("[<>:\"|?*]", "_");
        if (value.isBlank() || value.equals(".") || value.equals("..")) value = "archivo";
        if (value.length() > 180) value = value.substring(value.length() - 180);
        return value;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        if (dot < 1 || dot == filename.length() - 1) {
            throw new ResponseStatusException(BAD_REQUEST, "El archivo debe tener una extension permitida");
        }
        return filename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    private DetectedFile detectAndValidate(String extension, byte[] bytes) {
        return switch (extension) {
            case "png" -> require(signature(bytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
                    "image/png", CategoriaAdjuntoChat.IMAGEN);
            case "jpg", "jpeg" -> require(signature(bytes, 0xFF, 0xD8, 0xFF),
                    "image/jpeg", CategoriaAdjuntoChat.IMAGEN);
            case "webp" -> require(ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP"),
                    "image/webp", CategoriaAdjuntoChat.IMAGEN);
            case "pdf" -> require(ascii(bytes, 0, "%PDF-"),
                    "application/pdf", CategoriaAdjuntoChat.DOCUMENTO);
            case "docx" -> require(validDocx(bytes),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    CategoriaAdjuntoChat.DOCUMENTO);
            case "json" -> require(validJson(bytes), "application/json", CategoriaAdjuntoChat.DATOS);
            case "xml", "xmi" -> require(validXml(bytes),
                    extension.equals("xmi") ? "application/xmi+xml" : "application/xml",
                    CategoriaAdjuntoChat.DATOS);
            case "txt" -> require(validUtf8Text(bytes), "text/plain", CategoriaAdjuntoChat.DOCUMENTO);
            case "webm" -> require(signature(bytes, 0x1A, 0x45, 0xDF, 0xA3),
                    "audio/webm", CategoriaAdjuntoChat.AUDIO);
            case "ogg" -> require(ascii(bytes, 0, "OggS"), "audio/ogg", CategoriaAdjuntoChat.AUDIO);
            case "m4a", "mp4" -> require(ascii(bytes, 4, "ftyp"),
                    extension.equals("m4a") ? "audio/mp4" : "audio/mp4", CategoriaAdjuntoChat.AUDIO);
            default -> throw new ResponseStatusException(BAD_REQUEST, "Tipo de archivo no permitido");
        };
    }

    private DetectedFile require(boolean valid, String mime, CategoriaAdjuntoChat category) {
        if (!valid) throw new ResponseStatusException(BAD_REQUEST,
                "El contenido real del archivo no coincide con su extension");
        return new DetectedFile(mime, category);
    }

    private boolean signature(byte[] bytes, int... expected) {
        if (bytes.length < expected.length) return false;
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[i] & 0xFF) != expected[i]) return false;
        }
        return true;
    }

    private boolean ascii(byte[] bytes, int offset, String expected) {
        byte[] value = expected.getBytes(StandardCharsets.US_ASCII);
        if (bytes.length < offset + value.length) return false;
        for (int i = 0; i < value.length; i++) if (bytes[offset + i] != value[i]) return false;
        return true;
    }

    private boolean validUtf8Text(byte[] bytes) {
        if (bytes.length > 0 && bytes[0] == 0) return false;
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes));
            return true;
        } catch (CharacterCodingException e) {
            return false;
        }
    }

    private boolean validJson(byte[] bytes) {
        try { objectMapper.readTree(bytes); return true; }
        catch (Exception e) { return false; }
    }

    private boolean validXml(byte[] bytes) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.newDocumentBuilder().parse(new ByteArrayInputStream(bytes));
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean validDocx(byte[] bytes) {
        boolean contentTypes = false;
        boolean document = false;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;
            int entries = 0;
            while ((entry = zip.getNextEntry()) != null && entries++ < 500) {
                String name = entry.getName();
                if ("[Content_Types].xml".equals(name)) contentTypes = true;
                if ("word/document.xml".equals(name)) document = true;
            }
            return contentTypes && document;
        } catch (IOException e) {
            return false;
        }
    }

    private String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    public record PreparedAttachment(AdjuntoChatProyecto entity, Path tempPath, Path finalPath) { }
    private record DetectedFile(String mimeType, CategoriaAdjuntoChat category) { }
}
