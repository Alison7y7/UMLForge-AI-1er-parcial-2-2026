package com.umlforge.backend.service;

import com.umlforge.backend.dto.HistorialChatResponse;
import com.umlforge.backend.dto.MensajeChatRequest;
import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ChatProyectoServiceTest {

    private MensajeChatProyectoRepository repository;
    private ProjectAccessService accessService;
    private ApplicationEventPublisher eventPublisher;
    private ChatProyectoService service;
    private ChatAttachmentStorageService attachmentStorage;
    private Proyecto proyecto;
    private Usuario emisorReal;

    @BeforeEach
    void setUp() {
        repository = mock(MensajeChatProyectoRepository.class);
        accessService = mock(ProjectAccessService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        attachmentStorage = mock(ChatAttachmentStorageService.class);
        when(attachmentStorage.getMaxFileBytes()).thenReturn(10_485_760L);
        service = new ChatProyectoService(repository, accessService, new ObjectMapper(), eventPublisher,
                attachmentStorage);

        emisorReal = new Usuario();
        emisorReal.setId(5L);
        emisorReal.setNombre("Ada");
        emisorReal.setApellido("Lovelace");
        emisorReal.setCorreo("ada@test");
        proyecto = new Proyecto();
        proyecto.setId(9L);
        proyecto.setAnfitrion(emisorReal);
    }

    @Test
    void persisteIdentidadAutenticadaYPublicaUnSoloEvento() {
        when(accessService.requireUser("ada@test")).thenReturn(emisorReal);
        when(accessService.requireProjectAccess(9L, emisorReal)).thenReturn(proyecto);
        when(repository.saveAndFlush(any())).thenAnswer(invocation -> persisted(invocation.getArgument(0)));
        MensajeChatRequest request = new MensajeChatRequest();
        request.setContenido("  Revisemos el diagrama  ");
        request.setMetadatos(new ObjectMapper().createObjectNode().put("origen", "web"));

        MensajeChatResponse response = service.enviarMensaje(9L, request, "ada@test");

        ArgumentCaptor<MensajeChatProyecto> entity = ArgumentCaptor.forClass(MensajeChatProyecto.class);
        verify(repository).saveAndFlush(entity.capture());
        assertThat(entity.getValue().getUsuarioEmisor()).isSameAs(emisorReal);
        assertThat(entity.getValue().getTipoEmisor()).isEqualTo(TipoEmisorChat.USUARIO);
        assertThat(entity.getValue().getContenido()).isEqualTo("Revisemos el diagrama");
        assertThat(response.emisorId()).isEqualTo(5L);
        assertThat(response.tipoEmisor()).isEqualTo(TipoEmisorChat.USUARIO);
        verify(eventPublisher, times(1)).publishEvent(any(MensajeChatPublicadoEvent.class));
    }

    @Test
    void falloDePersistenciaNoGeneraEvento() {
        when(accessService.requireUser("ada@test")).thenReturn(emisorReal);
        when(accessService.requireProjectAccess(9L, emisorReal)).thenReturn(proyecto);
        when(repository.saveAndFlush(any())).thenThrow(new RuntimeException("fallo DB"));
        MensajeChatRequest request = new MensajeChatRequest();
        request.setContenido("mensaje");

        assertThatThrownBy(() -> service.enviarMensaje(9L, request, "ada@test"))
                .hasMessage("fallo DB");
        verifyNoInteractions(eventPublisher);
    }

    @Test
    void historialConsultaSoloElProyectoAutorizado() {
        MensajeChatProyecto mensaje = persisted(new MensajeChatProyecto());
        mensaje.setProyecto(proyecto);
        mensaje.setUsuarioEmisor(emisorReal);
        mensaje.setTipoEmisor(TipoEmisorChat.USUARIO);
        mensaje.setContenido("uno");
        mensaje.setEstado(EstadoMensajeChat.ENVIADO);
        when(repository.findByProyectoId(eq(9L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(mensaje)));

        HistorialChatResponse result = service.obtenerHistorial(9L, "ada@test", 0, 25);

        verify(accessService).requireProjectAccess(9L, "ada@test");
        verify(repository).findByProyectoId(eq(9L), any(Pageable.class));
        assertThat(result.mensajes()).hasSize(1);
        assertThat(result.mensajes().get(0).proyectoId()).isEqualTo(9L);
    }

    @Test
    void adjuntoInvalidoNoCreaMensajeIncompleto() {
        when(accessService.requireUser("ada@test")).thenReturn(emisorReal);
        when(accessService.requireProjectAccess(9L, emisorReal)).thenReturn(proyecto);
        var file = new MockMultipartFile("archivo", "mal.pdf", "application/pdf", new byte[] {1});
        when(attachmentStorage.prepare(file, proyecto)).thenThrow(new RuntimeException("archivo invalido"));

        assertThatThrownBy(() -> service.enviarMensajeConAdjuntos(
                9L, "", "{}", List.of(file), "ada@test"))
                .hasMessage("archivo invalido");
        verify(repository, never()).saveAndFlush(any());
        verifyNoInteractions(eventPublisher);
    }

    private MensajeChatProyecto persisted(MensajeChatProyecto mensaje) {
        mensaje.setId(101L);
        if (mensaje.getProyecto() == null) mensaje.setProyecto(proyecto);
        if (mensaje.getUsuarioEmisor() == null) mensaje.setUsuarioEmisor(emisorReal);
        if (mensaje.getTipoEmisor() == null) mensaje.setTipoEmisor(TipoEmisorChat.USUARIO);
        if (mensaje.getContenido() == null) mensaje.setContenido("contenido");
        mensaje.setFechaHora(LocalDateTime.of(2026, 11, 5, 12, 0));
        if (mensaje.getEstado() == null) mensaje.setEstado(EstadoMensajeChat.ENVIADO);
        mensaje.setCorrelacionId("2d41a13e-1a40-4f02-867d-df05fa6b6ae5");
        return mensaje;
    }
}
