package com.umlforge.backend.service;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import com.umlforge.backend.repository.RecomendacionAplicadaProyectoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecomendacionUmlApplicationServiceTest {
    private final ProjectAccessService access = mock(ProjectAccessService.class);
    private final MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
    private final DiagramaRepository diagrams = mock(DiagramaRepository.class);
    private final RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
    private final BitacoraService audit = mock(BitacoraService.class);
    private final ChatProyectoService chat = mock(ChatProyectoService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private RecomendacionUmlApplicationService service;
    private Usuario actor;
    private Proyecto project;
    private Diagrama diagram;
    private MensajeChatProyecto message;

    @BeforeEach
    void setup() {
        service = new RecomendacionUmlApplicationService(
                access, messages, diagrams, applied, audit, chat, mapper, events);
        Rol role = new Rol(); role.setNombre("COLABORADOR");
        actor = new Usuario(); actor.setId(7L); actor.setNombre("Elena"); actor.setApellido("Colaborador"); actor.setRol(role);
        project = new Proyecto(); project.setId(2L);
        diagram = new Diagrama(); diagram.setId(4L); diagram.setNombre("Ventas"); diagram.setProyecto(project); diagram.setVersion(3L);
        diagram.setModeloJson("{\"clases\":[{\"id\":\"c1\",\"nombre\":\"Cliente\",\"posicionX\":10,\"posicionY\":20,\"atributos\":[],\"metodos\":[]}],\"relaciones\":[]}");
        message = new MensajeChatProyecto(); message.setId(20L); message.setProyecto(project); message.setTipoEmisor(TipoEmisorChat.IA);
        message.setMetadatos("{\"recomendaciones\":[{\"id\":\"rec-1\",\"diagramaId\":4,\"versionDiagrama\":3,\"tipoCambio\":\"RENOMBRAR_CLASE\",\"descripcion\":\"Renombrar Cliente\",\"elementoAfectado\":{\"tipo\":\"CLASE\",\"id\":\"c1\",\"nombre\":\"Cliente\"},\"cambioPropuesto\":{\"nombre\":\"Comprador\"}}]}");
        when(access.requireUser(anyString())).thenReturn(actor);
        when(access.requireProjectAccess(2L, actor)).thenReturn(project);
        when(messages.findById(20L)).thenReturn(Optional.of(message));
        when(diagrams.findByIdForUpdate(4L)).thenReturn(Optional.of(diagram));
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> { diagram.setVersion(4L); return diagram; });
        when(applied.existsByMensajeIaIdAndRecomendacionId(20L, "rec-1")).thenReturn(false);
        when(chat.persistirMensajeInterno(any(), eq(TipoEmisorChat.SISTEMA), anyString(),
                eq(EstadoMensajeChat.COMPLETADO), any(), any())).thenReturn(null);
    }

    @Test
    void aplicaOriginalPersistidaRegistraAuditoriaYPublicaDespuesDelFlujoTransaccional() throws Exception {
        var response = service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test");

        assertThat(mapper.readTree(response.modeloJson()).path("clases").get(0).path("nombre").asText())
                .isEqualTo("Comprador");
        assertThat(response.versionAnterior()).isEqualTo(3L);
        assertThat(response.versionNueva()).isEqualTo(4L);
        verify(applied).save(argThat(value -> value.getRecomendacionId().equals("rec-1")
                && value.getAplicadaPor().getId().equals(7L)));
        verify(audit).registrarAccion(eq(actor), eq(project), eq("APLICAR_RECOMENDACION_IA"), contains("RENOMBRAR_CLASE"));
        verify(events).publishEvent(isA(DiagramaActualizadoEvent.class));
    }

    @Test
    void rechazaRecomendacionObsoletaSinMutarNiAuditar() {
        diagram.setVersion(4L);

        assertThatThrownBy(() -> service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
        verify(diagrams, never()).saveAndFlush(any());
        verifyNoInteractions(audit, events);
    }

    @Test
    void impideAplicacionDuplicada() {
        when(applied.existsByMensajeIaIdAndRecomendacionId(20L, "rec-1")).thenReturn(true);

        assertThatThrownBy(() -> service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
        verify(diagrams, never()).saveAndFlush(any());
    }
}
