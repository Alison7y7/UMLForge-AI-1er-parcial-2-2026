package com.umlforge.backend.service;

import com.umlforge.backend.entity.CategoriaAdjuntoChat;
import com.umlforge.backend.entity.Proyecto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ChatAttachmentStorageServiceTest {

    private Path tempDir;

    @BeforeEach
    void createWorkspaceTempDirectory() throws Exception {
        tempDir = Path.of("target", "test-attachments", UUID.randomUUID().toString());
        Files.createDirectories(tempDir);
    }

    @Test
    void validaContenidoRealYSaneaNombreAntesDePersistir() {
        var service = new ChatAttachmentStorageService(tempDir.toString(), 1024, new ObjectMapper());
        Proyecto proyecto = new Proyecto(); proyecto.setId(2L);
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1};

        var prepared = service.prepare(new MockMultipartFile(
                "archivo", "../../captura.png", "application/x-msdownload", png), proyecto);

        assertThat(prepared.entity().getNombreOriginal()).isEqualTo("captura.png");
        assertThat(prepared.entity().getMimeType()).isEqualTo("image/png");
        assertThat(prepared.entity().getCategoria()).isEqualTo(CategoriaAdjuntoChat.IMAGEN);
        assertThat(prepared.finalPath().normalize().startsWith(tempDir.toAbsolutePath().normalize())).isTrue();
        service.cleanup(prepared);
    }

    @Test
    void rechazaExtensionPermitidaConContenidoFalsoYArchivosGrandes() {
        var service = new ChatAttachmentStorageService(tempDir.toString(), 8, new ObjectMapper());
        Proyecto proyecto = new Proyecto(); proyecto.setId(2L);

        assertThatThrownBy(() -> service.prepare(new MockMultipartFile(
                "archivo", "falso.pdf", "application/pdf", "ejecutable".getBytes(StandardCharsets.UTF_8)), proyecto))
                .isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.prepare(new MockMultipartFile(
                "archivo", "datos.txt", "text/plain", "demasiado grande".getBytes(StandardCharsets.UTF_8)), proyecto))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void aceptaJsonValidoYRechazaJsonInvalido() {
        var service = new ChatAttachmentStorageService(tempDir.toString(), 1024, new ObjectMapper());
        Proyecto proyecto = new Proyecto(); proyecto.setId(2L);
        var prepared = service.prepare(new MockMultipartFile(
                "archivo", "modelo.json", "text/plain", "{\"clases\":[]}".getBytes(StandardCharsets.UTF_8)), proyecto);
        assertThat(prepared.entity().getCategoria()).isEqualTo(CategoriaAdjuntoChat.DATOS);
        service.cleanup(prepared);

        assertThatThrownBy(() -> service.prepare(new MockMultipartFile(
                "archivo", "modelo.json", "application/json", "no-json".getBytes(StandardCharsets.UTF_8)), proyecto))
                .isInstanceOf(ResponseStatusException.class);
    }
}
