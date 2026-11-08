package com.umlforge.backend.service;

import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import org.springframework.security.access.AccessDeniedException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProyectoHistorialServiceTest {

    @Test
    void continuidadIncluyeCambiosDeDiasAnterioresOrdenadosYConSuDiagrama() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario member = new Usuario(); member.setId(4L); member.setNombre("Elena");
        Proyecto project = new Proyecto(); project.setId(12L);
        Diagrama first = new Diagrama(); first.setId(4L); first.setNombre("Dominio"); first.setVersion(3L);
        first.setProyecto(project); first.setFechaActualizacion(LocalDateTime.parse("2026-11-08T09:00:00"));
        Diagrama second = new Diagrama(); second.setId(5L); second.setNombre("Biblioteca"); second.setVersion(7L);
        second.setProyecto(project); second.setFechaActualizacion(LocalDateTime.parse("2026-11-08T10:00:00"));
        Bitacora yesterday = activity(2L, project, member, "MODIFICAR_DIAGRAMA",
                "Modificó el diagrama: Biblioteca", "2026-11-07T18:00:00");
        Bitacora older = activity(1L, project, member, "APLICAR_RECOMENDACION_IA",
                "Aplicó recomendación en el diagrama Dominio", "2026-11-03T10:00:00");
        when(access.requireUser("elena@test")).thenReturn(member);
        when(access.requireProjectAccess(12L, member)).thenReturn(project);
        when(history.searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of());
        when(history.searchActivities(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(older, yesterday));
        when(applied.findByProyectoId(12L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(12L)).thenReturn(List.of(first, second));
        when(diagrams.findFirstByProyectoIdAndActivoTrueOrderByFechaActualizacionDesc(12L))
                .thenReturn(Optional.of(second));
        when(messages.findByProyectoIdOrderByFechaHoraDescIdDesc(eq(12L), any(Pageable.class)))
                .thenReturn(List.of());

        var result = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history,
                new ObjectMapper()).continuidad(12L, "elena@test");

        assertThat(result.ultimaActividad()).isEqualTo(Instant.parse("2026-11-07T18:00:00Z"));
        assertThat(result.cambiosRecientes()).extracting(event -> event.id())
                .containsExactly("ACTIVIDAD:2", "ACTIVIDAD:1");
        assertThat(result.cambiosRecientes()).extracting(event -> event.diagramaId())
                .containsExactly(5L, 4L);
        assertThat(result.ultimoDiagrama().version()).isEqualTo(7L);
    }

    @Test
    void unificaCronologicamenteYNoConfundePropuestaConAplicacion() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        ObjectMapper mapper = new ObjectMapper();

        Usuario user = new Usuario(); user.setId(3L); user.setNombre("Ada"); user.setCorreo("ada@test");
        Proyecto project = new Proyecto(); project.setId(9L);
        Diagrama diagram = new Diagrama(); diagram.setId(7L); diagram.setNombre("Dominio"); diagram.setVersion(4L);
        diagram.setProyecto(project);
        MensajeChatProyecto proposal = new MensajeChatProyecto(); proposal.setId(20L); proposal.setProyecto(project);
        proposal.setTipoEmisor(TipoEmisorChat.IA); proposal.setContenido("Sugiero agregar email");
        proposal.setEstado(EstadoMensajeChat.COMPLETADO); proposal.setFechaHora(LocalDateTime.parse("2026-11-08T12:00:00"));
        proposal.setAdjuntos(new java.util.ArrayList<>());
        proposal.setMetadatos("""
                {"diagramaId":7,"recomendaciones":[{"id":"rec-1","diagramaId":7,
                "versionDiagrama":4,"descripcion":"Agregar email"}]}
                """);
        Bitacora activity = new Bitacora(); activity.setId(2L); activity.setProyecto(project); activity.setUsuario(user);
        activity.setAccion("MODIFICAR_DIAGRAMA"); activity.setDescripcion("Ada guardó el diagrama");
        activity.setFechaHora(LocalDateTime.parse("2026-11-08T11:00:00"));

        when(access.requireUser("ada@test")).thenReturn(user);
        when(access.requireProjectAccess(9L, user)).thenReturn(project);
        when(history.searchMessages(eq(9L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(proposal));
        when(history.searchActivities(eq(9L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(activity));
        when(applied.findByProyectoId(9L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(9L)).thenReturn(List.of(diagram));

        ProyectoHistorialService service = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history, mapper);
        var result = service.obtener(9L, "ada@test", null, 20, null, null, null, null, null, null);

        assertThat(result.eventos()).extracting(event -> event.tipo()).containsExactly("RESPUESTA_IA", "CAMBIO_UML");
        assertThat(result.eventos().get(0).metadatos().path("recomendaciones").get(0)
                .path("estadoHistorial").asText()).isEqualTo("PENDIENTE");
        verify(access).requireProjectAccess(9L, user);
    }

    @Test
    void aplicaCursorYFiltrosEnLaConsultaAcotada() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario user = new Usuario(); user.setId(3L);
        when(access.requireUser(anyString())).thenReturn(user);
        when(applied.findByProyectoId(9L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(9L)).thenReturn(List.of());

        ProyectoHistorialService service = new ProyectoHistorialService(access, messages, activities, applied,
                diagrams, history, new ObjectMapper());
        service.obtener(9L, "ada@test", "2026-11-08T12:00:00Z", 10,
                Instant.parse("2026-11-01T00:00:00Z"), null, 3L, null, "cliente", null);

        verify(history).searchMessages(eq(9L), eq(LocalDateTime.parse("2026-11-08T12:00:00")),
                eq(LocalDateTime.parse("2026-11-01T00:00:00")), isNull(), eq(3L), eq("cliente"), anyInt());
        verify(history).searchActivities(eq(9L), eq(LocalDateTime.parse("2026-11-08T12:00:00")),
                eq(LocalDateTime.parse("2026-11-01T00:00:00")), isNull(), eq(3L), eq("cliente"), anyInt());
    }

    @Test
    void noConsultaDatosCuandoElUsuarioNoPerteneceAlProyecto() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario outsider = new Usuario(); outsider.setId(99L);
        when(access.requireUser("externo@test")).thenReturn(outsider);
        doThrow(new AccessDeniedException("Proyecto ajeno")).when(access).requireProjectAccess(9L, outsider);

        ProyectoHistorialService service = new ProyectoHistorialService(access, messages, activities, applied,
                diagrams, history, new ObjectMapper());

        assertThatThrownBy(() -> service.obtener(9L, "externo@test", null, 20,
                null, null, null, null, null, null)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(messages, activities, applied, diagrams, history);
    }

    @Test
    void proyectoSinActividadDevuelveRespuestaVaciaValida() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario member = new Usuario(); member.setId(4L);
        Proyecto project = new Proyecto(); project.setId(12L);
        when(access.requireUser("miembro@test")).thenReturn(member);
        when(access.requireProjectAccess(12L, member)).thenReturn(project);
        when(history.searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of());
        when(history.searchActivities(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of());
        when(applied.findByProyectoId(12L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(12L)).thenReturn(List.of());

        var service = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history, new ObjectMapper());
        var result = service.obtener(12L, "miembro@test", null, 30, null, null, null, null, null, null);

        assertThat(result.eventos()).isEmpty();
        assertThat(result.hayMas()).isFalse();
        assertThat(result.siguienteCursor()).isNull();
    }

    @Test
    void toleraMensajeAnteriorACu19ConMetadatosYCamposOpcionalesAusentes() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario member = new Usuario(); member.setId(4L);
        Proyecto project = new Proyecto(); project.setId(12L);
        MensajeChatProyecto legacy = historyMessage(1L, project, "Mensaje histórico", "2026-01-01T10:00:00", null);
        legacy.setTipoEmisor(TipoEmisorChat.SISTEMA);
        when(access.requireUser(anyString())).thenReturn(member);
        when(history.searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(legacy));
        when(history.searchActivities(anyLong(), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of());
        when(applied.findByProyectoId(12L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(12L)).thenReturn(List.of());

        var result = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history, new ObjectMapper())
                .obtener(12L, "miembro@test", null, 30, null, null, null, null, null, null);

        assertThat(result.eventos()).hasSize(1);
        assertThat(result.eventos().get(0).tipo()).isEqualTo("DECISION");
        assertThat(result.eventos().get(0).metadatos().isObject()).isTrue();
    }

    @Test
    void filtroDeDiagramaYAislamientoConservanSoloElProyectoYDiagramaSolicitados() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario member = new Usuario(); member.setId(4L);
        Proyecto project = new Proyecto(); project.setId(12L);
        Diagrama first = new Diagrama(); first.setId(30L); first.setNombre("A"); first.setProyecto(project);
        Diagrama second = new Diagrama(); second.setId(31L); second.setNombre("B"); second.setProyecto(project);
        MensajeChatProyecto a = historyMessage(1L, project, "A", "2026-01-02T10:00:00", "{\"diagramaId\":30}");
        MensajeChatProyecto b = historyMessage(2L, project, "B", "2026-01-01T10:00:00", "{\"diagramaId\":31}");
        when(access.requireUser(anyString())).thenReturn(member);
        when(history.searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(a, b));
        when(applied.findByProyectoId(12L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(12L)).thenReturn(List.of(first, second));

        var result = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history, new ObjectMapper())
                .obtener(12L, "miembro@test", null, 30, null, null, null, "RESPUESTA_IA", null, 31L);

        assertThat(result.eventos()).extracting(event -> event.diagramaId()).containsExactly(31L);
        verify(history).searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt());
        verify(history, never()).searchMessages(eq(13L), any(), any(), any(), any(), any(), anyInt());
    }

    @Test
    void cursorPaginadoEsAcotadoYDevuelveSiguienteCursor() {
        ProjectAccessService access = mock(ProjectAccessService.class);
        MensajeChatProyectoRepository messages = mock(MensajeChatProyectoRepository.class);
        BitacoraRepository activities = mock(BitacoraRepository.class);
        RecomendacionAplicadaProyectoRepository applied = mock(RecomendacionAplicadaProyectoRepository.class);
        DiagramaRepository diagrams = mock(DiagramaRepository.class);
        ProyectoHistorialQueryRepository history = mock(ProyectoHistorialQueryRepository.class);
        Usuario member = new Usuario(); member.setId(4L);
        Proyecto project = new Proyecto(); project.setId(12L);
        when(access.requireUser(anyString())).thenReturn(member);
        when(history.searchMessages(eq(12L), isNull(), isNull(), isNull(), isNull(), isNull(), anyInt()))
                .thenReturn(List.of(
                        historyMessage(3L, project, "3", "2026-01-03T10:00:00", "{}"),
                        historyMessage(2L, project, "2", "2026-01-02T10:00:00", "{}"),
                        historyMessage(1L, project, "1", "2026-01-01T10:00:00", "{}")));
        when(applied.findByProyectoId(12L)).thenReturn(List.of());
        when(diagrams.findByProyectoId(12L)).thenReturn(List.of());

        var result = new ProyectoHistorialService(access, messages, activities, applied, diagrams, history, new ObjectMapper())
                .obtener(12L, "miembro@test", null, 2, null, null, null, "RESPUESTA_IA", null, null);

        assertThat(result.eventos()).hasSize(2);
        assertThat(result.hayMas()).isTrue();
        assertThat(result.siguienteCursor()).isNotBlank();
    }

    private MensajeChatProyecto historyMessage(Long id, Proyecto project, String content,
            String date, String metadata) {
        MensajeChatProyecto message = new MensajeChatProyecto();
        message.setId(id); message.setProyecto(project); message.setTipoEmisor(TipoEmisorChat.IA);
        message.setContenido(content); message.setEstado(EstadoMensajeChat.COMPLETADO);
        message.setFechaHora(LocalDateTime.parse(date)); message.setMetadatos(metadata);
        return message;
    }

    private Bitacora activity(Long id, Proyecto project, Usuario user, String action,
            String description, String date) {
        Bitacora activity = new Bitacora();
        activity.setId(id); activity.setProyecto(project); activity.setUsuario(user);
        activity.setAccion(action); activity.setDescripcion(description);
        activity.setFechaHora(LocalDateTime.parse(date));
        return activity;
    }
}
