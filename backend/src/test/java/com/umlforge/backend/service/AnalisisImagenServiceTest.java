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
import com.umlforge.backend.service.ia.image.FallbackImageProvider;
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

    @Test
    void preservesAssociationClassMultiplicitiesAndReviewWarnings() {
        ImageIAProvider gemini = provider("gemini-vision", 10);
        when(gemini.analyze(any(byte[].class), anyString(), anyString()))
                .thenReturn(new ImageIAProviderResult(associationClassModelJson(), 55));

        Usuario usuario = new Usuario();
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        AnalisisImagenRepository repository = repositoryAssigningId();
        AnalisisImagenService service = new AnalisisImagenService(
                List.of(gemini), repository, usuarioRepository, mock(DiagramaService.class),
                new UmlModelValidator(), new ObjectMapper());

        AnalisisImagenResponse response = service.reconstruir(
                new MockMultipartFile("archivo", "ingeniero.png", "image/png", pngBytes()),
                null, "user@test.com");

        assertThat(response.modelo().clases())
                .extracting("nombre")
                .containsExactlyInAnyOrder("Venta", "Producto", "Detalle");
        assertThat(response.modelo().relaciones()).singleElement().satisfies(relation -> {
            assertThat(relation.origen()).isEqualTo("venta");
            assertThat(relation.destino()).isEqualTo("producto");
            assertThat(relation.multiplicidadOrigen()).isEqualTo("1");
            assertThat(relation.multiplicidadDestino()).isEmpty();
            assertThat(relation.claseAsociacion()).isEqualTo("detalle");
        });
        assertThat(response.modelo().advertencias())
                .containsExactly("Multiplicidad de Producto pendiente de revision");
    }

    @Test
    void preservesExplicitTypesAndMarksContextualSuggestionsForDifferentNames() {
        ImageIAProvider gemini = provider("gemini-vision", 10);
        when(gemini.analyze(any(byte[].class), anyString(), anyString()))
                .thenReturn(new ImageIAProviderResult(attributeTypesModelJson(), 22));

        Usuario usuario = new Usuario();
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        AnalisisImagenService service = new AnalisisImagenService(
                List.of(gemini), repositoryAssigningId(), usuarioRepository,
                mock(DiagramaService.class), new UmlModelValidator(), new ObjectMapper());

        AnalisisImagenResponse response = service.reconstruir(
                new MockMultipartFile("archivo", "documento.png", "image/png", pngBytes()),
                null, "user@test.com");

        assertThat(response.modelo().clases().get(0).atributos())
                .extracting("nombre", "tipo", "origenTipo")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("codigoExterno", "UUID<Tenant>", "IMAGEN"),
                        org.assertj.core.groups.Tuple.tuple("importePendiente", "BigDecimal", "SUGERIDO"),
                        org.assertj.core.groups.Tuple.tuple("fechaCierre", "LocalDate", "SUGERIDO"));
    }

    @Test
    void invalidJsonAndUnavailableTemplateEndAsFailureWithoutGenericDiagram() {
        ImageIAProvider gemini = provider("gemini-vision", 10);
        when(gemini.analyze(any(byte[].class), anyString(), anyString()))
                .thenReturn(new ImageIAProviderResult("esto no es JSON", 2));

        Usuario usuario = new Usuario();
        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        List<EstadoAnalisis> states = new ArrayList<>();
        AnalisisImagenRepository repository = mock(AnalisisImagenRepository.class);
        when(repository.save(any(AnalisisImagen.class))).thenAnswer(invocation -> {
            AnalisisImagen entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(51L);
            states.add(entity.getEstado());
            return entity;
        });
        AnalisisImagenService service = new AnalisisImagenService(
                List.of(new FallbackImageProvider(), gemini), repository, usuarioRepository,
                mock(DiagramaService.class), new UmlModelValidator(), new ObjectMapper());

        assertThatThrownBy(() -> service.reconstruir(
                new MockMultipartFile("archivo", "ingeniero.png", "image/png", pngBytes()),
                null, "user@test.com"))
                .isInstanceOf(AnalisisImagenServiceException.class)
                .hasMessageContaining("No fue posible reconstruir");
        assertThat(states).containsExactly(
                EstadoAnalisis.SUBIDA, EstadoAnalisis.PROCESANDO, EstadoAnalisis.ERROR);
        verify(gemini).analyze(any(byte[].class), anyString(), anyString());
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

    private AnalisisImagenRepository repositoryAssigningId() {
        AnalisisImagenRepository repository = mock(AnalisisImagenRepository.class);
        when(repository.save(any(AnalisisImagen.class))).thenAnswer(invocation -> {
            AnalisisImagen entity = invocation.getArgument(0);
            if (entity.getId() == null) entity.setId(50L);
            return entity;
        });
        return repository;
    }

    private String associationClassModelJson() {
        return """
            {
              "advertencias": ["Multiplicidad de Producto pendiente de revision"],
              "clases": [
                {"id":"venta","nombre":"Venta","estereotipo":"","posicionX":100,"posicionY":100,"atributos":[],"metodos":[]},
                {"id":"producto","nombre":"Producto","estereotipo":"","posicionX":400,"posicionY":100,"atributos":[],"metodos":[]},
                {"id":"detalle","nombre":"Detalle","estereotipo":"","posicionX":250,"posicionY":300,"atributos":[{"id":"cantidad","nombre":"cantidad","tipo":"","visibilidad":"unspecified"}],"metodos":[]}
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

    private String attributeTypesModelJson() {
        return """
            {
              "advertencias": [],
              "clases": [{
                "id": "documento",
                "nombre": "Documento",
                "estereotipo": "",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [
                  {"id":"a1","nombre":"codigoExterno","tipo":"UUID<Tenant>","visibilidad":"private","origenTipo":"IMAGEN"},
                  {"id":"a2","nombre":"importePendiente","tipo":"BigDecimal","visibilidad":"private","origenTipo":"SUGERIDO"},
                  {"id":"a3","nombre":"fechaCierre","tipo":"LocalDate","visibilidad":"private","origenTipo":"SUGERIDO"}
                ],
                "metodos": []
              }],
              "relaciones": []
            }
            """;
    }
}
