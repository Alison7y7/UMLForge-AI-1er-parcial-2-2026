package com.umlforge.backend.service;

import com.umlforge.backend.dto.AnalisisImagenResponse;
import com.umlforge.backend.entity.AnalisisImagen;
import com.umlforge.backend.entity.EstadoAnalisis;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.AnalisisImagenRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ia.image.ImageIAProvider;
import com.umlforge.backend.service.ia.image.ImageIAProviderException;
import com.umlforge.backend.service.ia.image.ImageIAProviderResult;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnalisisImagenServiceTest {

    @Test
    void usesProvidersByPriorityAndPersistsLifecycle() {
        ImageIAProvider gemini = provider("gemini-vision", 10);
        ImageIAProvider ollama = provider("ollama-vision", 20);
        when(gemini.analyze(any(byte[].class), anyString(), anyString()))
                .thenThrow(new ImageIAProviderException("sin cuota"));
        when(ollama.analyze(any(byte[].class), anyString(), anyString()))
                .thenReturn(new ImageIAProviderResult(validModelJson(), 31));

        Usuario usuario = new Usuario();
        usuario.setId(9L);
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));

        List<EstadoAnalisis> states = new ArrayList<>();
        AnalisisImagenRepository repository = mock(AnalisisImagenRepository.class);
        when(repository.save(any(AnalisisImagen.class))).thenAnswer(invocation -> {
            AnalisisImagen entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(41L);
            states.add(entity.getEstado());
            return entity;
        });

        AnalisisImagenService service = new AnalisisImagenService(
                List.of(ollama, gemini), repository, usuarioRepository,
                mock(DiagramaService.class), new UmlModelValidator(), new ObjectMapper());
        MockMultipartFile file = new MockMultipartFile(
                "archivo", "diagrama.png", "image/png", pngBytes());

        AnalisisImagenResponse response = service.reconstruir(file, null, "user@test.com");

        assertThat(response.analisisId()).isEqualTo(41L);
        assertThat(response.proveedor()).isEqualTo("ollama-vision");
        assertThat(response.tokensUsados()).isEqualTo(31);
        assertThat(response.modelo().clases()).hasSize(1);
        assertThat(states).containsExactly(
                EstadoAnalisis.SUBIDA, EstadoAnalisis.PROCESANDO, EstadoAnalisis.COMPLETADA);
        verify(gemini).analyze(any(byte[].class), anyString(), anyString());
        verify(ollama).analyze(any(byte[].class), anyString(), anyString());
    }

    @Test
    void rejectsContentWhoseSignatureDoesNotMatchMimeTypeBeforePersisting() {
        Usuario usuario = new Usuario();
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        AnalisisImagenRepository repository = mock(AnalisisImagenRepository.class);
        AnalisisImagenService service = new AnalisisImagenService(
                List.of(), repository, usuarioRepository, mock(DiagramaService.class),
                new UmlModelValidator(), new ObjectMapper());
        MockMultipartFile file = new MockMultipartFile(
                "archivo", "falso.png", "image/png", "no-es-png".getBytes());

        assertThatThrownBy(() -> service.reconstruir(file, null, "user@test.com"))
                .isInstanceOf(AnalisisImagenServiceException.class)
                .hasMessageContaining("Formato no compatible");
        verify(repository, never()).save(any());
    }

    private ImageIAProvider provider(String name, int priority) {
        ImageIAProvider provider = mock(ImageIAProvider.class);
        when(provider.getName()).thenReturn(name);
        when(provider.getPriority()).thenReturn(priority);
        when(provider.isAvailable()).thenReturn(true);
        return provider;
    }

    private byte[] pngBytes() {
        return new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
    }

    private String validModelJson() {
        return """
            {
              "clases": [{
                "id": "clase-1",
                "nombre": "Libro",
                "estereotipo": "entity",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [{
                  "id": "atributo-1",
                  "nombre": "id",
                  "tipo": "Long",
                  "visibilidad": "private"
                }],
                "metodos": []
              }],
              "relaciones": []
            }
            """;
    }
}
