package com.umlforge.backend.service;

import com.umlforge.backend.dto.IAModelRequest;
import com.umlforge.backend.dto.IAModelResponse;
import com.umlforge.backend.dto.UmlModelDto;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.PeticionIA;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.PeticionIARepository;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.service.ia.IAProvider;
import com.umlforge.backend.service.ia.IAProviderException;
import com.umlforge.backend.service.ia.IAProviderResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IAServiceTest {

    @Test
    void usesNextProviderAndPersistsSuccessfulRequest() {
        IAProvider ollama = provider("ollama", 10, true);
        IAProvider gemini = provider("gemini", 20, true);
        when(ollama.generate(org.mockito.ArgumentMatchers.anyString()))
                .thenThrow(new IAProviderException("offline"));

        UmlModelDto model = validModel();
        when(gemini.generate(org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(new IAProviderResult(model, 25));

        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        PeticionIARepository peticionRepository = mock(PeticionIARepository.class);
        DiagramaService diagramaService = mock(DiagramaService.class);
        Usuario usuario = new Usuario();
        usuario.setId(7L);
        Diagrama diagrama = new Diagrama();
        diagrama.setId(3L);
        diagrama.setModeloJson("{\"clases\":[],\"relaciones\":[]}");
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        when(diagramaService.obtenerEntidadConAcceso(3L, usuario)).thenReturn(diagrama);
        when(peticionRepository.save(org.mockito.ArgumentMatchers.any(PeticionIA.class)))
                .thenAnswer(invocation -> {
                    PeticionIA entity = invocation.getArgument(0);
                    entity.setId(11L);
                    return entity;
                });

        IAService service = new IAService(
                List.of(gemini, ollama), usuarioRepository, peticionRepository,
                diagramaService, new UmlModelValidator(), new ObjectMapper()
        );

        IAModelResponse response = service.modelar(new IAModelRequest(3L, "biblioteca"), "user@test.com");

        assertThat(response.peticionId()).isEqualTo(11L);
        assertThat(response.proveedor()).isEqualTo("gemini");
        assertThat(response.modelo()).isSameAs(model);
        ArgumentCaptor<PeticionIA> captor = ArgumentCaptor.forClass(PeticionIA.class);
        verify(peticionRepository).save(captor.capture());
        assertThat(captor.getValue().getDiagrama()).isSameAs(diagrama);
        assertThat(captor.getValue().getUsuario()).isSameAs(usuario);
        assertThat(captor.getValue().getExitoso()).isTrue();
        assertThat(captor.getValue().getResultadoJson()).contains("gemini", "clase-libro");
        verify(gemini).generate(org.mockito.ArgumentMatchers.argThat(prompt ->
                prompt.contains("MODELO UML EXISTENTE") && prompt.contains("biblioteca")
        ));
    }

    @Test
    void generatesFromScratchWithoutLoadingDiagram() {
        IAProvider fallback = provider("fallback-local", 100, true);
        UmlModelDto model = validModel();
        when(fallback.generate("crear biblioteca")).thenReturn(new IAProviderResult(model, 0));

        UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
        PeticionIARepository peticionRepository = mock(PeticionIARepository.class);
        DiagramaService diagramaService = mock(DiagramaService.class);
        Usuario usuario = new Usuario();
        usuario.setId(7L);
        when(usuarioRepository.findByCorreo("user@test.com")).thenReturn(Optional.of(usuario));
        when(peticionRepository.save(org.mockito.ArgumentMatchers.any(PeticionIA.class)))
                .thenAnswer(invocation -> {
                    PeticionIA entity = invocation.getArgument(0);
                    entity.setId(12L);
                    return entity;
                });

        IAService service = new IAService(
                List.of(fallback), usuarioRepository, peticionRepository,
                diagramaService, new UmlModelValidator(), new ObjectMapper()
        );

        IAModelResponse response = service.modelar(
                new IAModelRequest(null, "crear biblioteca"), "user@test.com"
        );

        assertThat(response.peticionId()).isEqualTo(12L);
        ArgumentCaptor<PeticionIA> captor = ArgumentCaptor.forClass(PeticionIA.class);
        verify(peticionRepository).save(captor.capture());
        assertThat(captor.getValue().getDiagrama()).isNull();
        verify(diagramaService, never()).obtenerEntidadConAcceso(
                org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.any(Usuario.class)
        );
    }

    private IAProvider provider(String name, int priority, boolean available) {
        IAProvider provider = mock(IAProvider.class);
        when(provider.getName()).thenReturn(name);
        when(provider.getPriority()).thenReturn(priority);
        when(provider.isAvailable()).thenReturn(available);
        return provider;
    }

    private UmlModelDto validModel() {
        UmlModelDto.UmlClass book = new UmlModelDto.UmlClass(
                "clase-libro", "Libro", "entity", 100, 100,
                List.of(new UmlModelDto.UmlAttribute("attr-id", "id", "Long", "private")),
                List.of()
        );
        return new UmlModelDto(List.of(book), List.of());
    }
}
