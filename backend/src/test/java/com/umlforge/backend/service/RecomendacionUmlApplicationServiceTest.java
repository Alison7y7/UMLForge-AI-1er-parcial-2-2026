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
import tools.jackson.databind.JsonNode;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecomendacionUmlApplicationServiceTest {
    private ProjectAccessService access;
    private MensajeChatProyectoRepository messages;
    private DiagramaRepository diagrams;
    private RecomendacionAplicadaProyectoRepository applied;
    private BitacoraService audit;
    private ChatProyectoService chat;
    private ApplicationEventPublisher events;
    private ObjectMapper mapper;
    private RecomendacionUmlApplicationService service;
    private Usuario actor;
    private Proyecto project;
    private Diagrama diagram;
    private MensajeChatProyecto message;

    @BeforeEach
    void setup() {
        access = mock(ProjectAccessService.class);
        messages = mock(MensajeChatProyectoRepository.class);
        diagrams = mock(DiagramaRepository.class);
        applied = mock(RecomendacionAplicadaProyectoRepository.class);
        audit = mock(BitacoraService.class);
        chat = mock(ChatProyectoService.class);
        events = mock(ApplicationEventPublisher.class);
        mapper = new ObjectMapper();
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
        when(diagrams.findById(4L)).thenReturn(Optional.of(diagram));
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
    void permiteRevalidarYAplicarPropuestaSobreVersionMasRecienteSiEsCompatible() throws Exception {
        diagram.setVersion(4L);
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> { diagram.setVersion(5L); return diagram; });

        var response = service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test");

        assertThat(mapper.readTree(response.modeloJson()).path("clases").get(0).path("nombre").asText())
                .isEqualTo("Comprador");
        assertThat(response.versionAnterior()).isEqualTo(4L);
        assertThat(response.versionNueva()).isEqualTo(5L);
        verify(applied).save(argThat(value -> value.getRecomendacionId().equals("rec-1")
                && value.getVersionOrigen().equals(4L)
                && value.getVersionResultado().equals(5L)));
        verify(audit).registrarAccion(eq(actor), eq(project), eq("APLICAR_RECOMENDACION_IA"),
                contains("revalidada y aplicada sobre v4"));
    }

    @Test
    void rechazaRecomendacionIncompatibleCuandoElementoYaNoExisteEnVersionNueva() {
        diagram.setVersion(4L);
        diagram.setModeloJson("{\"clases\":[],\"relaciones\":[]}");

        assertThatThrownBy(() -> service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
        verify(diagrams, never()).saveAndFlush(any());
        verifyNoInteractions(audit, events);
    }

    @Test
    void aplicaSecuencialmenteDosClasesLibroYEjemplarDeMismaRevision() throws Exception {
        diagram.setVersion(3L);
        diagram.setModeloJson("{\"clases\":[],\"relaciones\":[]}");
        message.setMetadatos("""
                {"recomendaciones":[
                  {"id":"rec-libro","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Libro","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Libro"},"cambioPropuesto":{"nombre":"Libro","posicionX":100,"posicionY":100,"atributos":[{"nombre":"titulo","tipo":"String"}],"metodos":[]}},
                  {"id":"rec-ejemplar","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Ejemplar","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Ejemplar"},"cambioPropuesto":{"nombre":"Ejemplar","posicionX":350,"posicionY":100,"atributos":[{"nombre":"codigo","tipo":"String"}],"metodos":[],"relaciones":[{"destino":"Libro","tipo":"COMPOSICION"}]}}
                ]}
                """);

        // 1. Antes de aplicar Libro, Ejemplar depende de Libro
        var revalPrevia = service.revalidar(2L, "rec-ejemplar", 20L, "elena@test");
        assertThat(revalPrevia.compatible()).isFalse();
        assertThat(revalPrevia.pendienteDependencia()).isTrue();
        assertThat(revalPrevia.dependenciaRequerida()).isEqualTo("Libro");
        assertThat(revalPrevia.estado()).isEqualTo("PENDIENTE_DEPENDENCIA");

        // 2. Aplicar Libro: incrementa version a 4L
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> { diagram.setVersion(4L); return diagram; });
        var resLibro = service.aplicar(2L, "rec-libro", new AplicarRecomendacionRequest(20L), "elena@test");
        assertThat(resLibro.versionNueva()).isEqualTo(4L);
        JsonNode modelV4 = mapper.readTree(resLibro.modeloJson());
        assertThat(modelV4.path("clases")).hasSize(1);
        assertThat(modelV4.path("clases").get(0).path("nombre").asText()).isEqualTo("Libro");

        // 3. Revalidar Ejemplar sobre el diagrama actualizado (v4): ahora es COMPATIBLE
        diagram.setModeloJson(resLibro.modeloJson());
        var revalPosterior = service.revalidar(2L, "rec-ejemplar", 20L, "elena@test");
        assertThat(revalPosterior.compatible()).isTrue();
        assertThat(revalPosterior.pendienteDependencia()).isFalse();
        assertThat(revalPosterior.estado()).isEqualTo("COMPATIBLE");

        // 4. Aplicar Ejemplar: incrementa version a 5L y resuelve la relacion conectada a Libro
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> { diagram.setVersion(5L); return diagram; });
        var resEjemplar = service.aplicar(2L, "rec-ejemplar", new AplicarRecomendacionRequest(20L), "elena@test");
        assertThat(resEjemplar.versionNueva()).isEqualTo(5L);
        JsonNode modelV5 = mapper.readTree(resEjemplar.modeloJson());
        assertThat(modelV5.path("clases")).hasSize(2);
        assertThat(modelV5.path("relaciones")).hasSize(1);
        String libroId = modelV5.path("clases").get(0).path("id").asText();
        String ejemplarId = modelV5.path("clases").get(1).path("id").asText();
        assertThat(modelV5.path("relaciones").get(0).path("origen").asText()).isEqualTo(ejemplarId);
        assertThat(modelV5.path("relaciones").get(0).path("destino").asText()).isEqualTo(libroId);
    }

    @Test
    void rechazaPropuestaAgregarClaseSiNombreYaExisteEnModelo() {
        diagram.setModeloJson("{\"clases\":[{\"id\":\"c-libro\",\"nombre\":\"Libro\",\"atributos\":[],\"metodos\":[]}],\"relaciones\":[]}");
        message.setMetadatos("""
                {"recomendaciones":[
                  {"id":"rec-dup","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Libro","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Libro"},"cambioPropuesto":{"nombre":"Libro"}}
                ]}
                """);

        assertThatThrownBy(() -> service.aplicar(2L, "rec-dup", new AplicarRecomendacionRequest(20L), "elena@test"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
    }

    @Test
    void aplicarCompatiblesEnLoteEjecutaAtomicamenteYResuelveDependencias() throws Exception {
        diagram.setVersion(3L);
        diagram.setModeloJson("{\"clases\":[],\"relaciones\":[]}");
        message.setMetadatos("""
                {"recomendaciones":[
                  {"id":"rec-e","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Ejemplar","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Ejemplar"},"cambioPropuesto":{"nombre":"Ejemplar","relaciones":[{"destino":"Libro","tipo":"COMPOSICION"}]}},
                  {"id":"rec-l","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Libro","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Libro"},"cambioPropuesto":{"nombre":"Libro"}}
                ]}
                """);
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> { diagram.setVersion(4L); return diagram; });

        var loteRes = service.aplicarCompatibles(2L, 20L, "elena@test");

        assertThat(loteRes.recomendacionesAplicadasIds()).containsExactlyInAnyOrder("rec-l", "rec-e");
        JsonNode model = mapper.readTree(loteRes.modeloJson());
        assertThat(model.path("clases")).hasSize(2);
        assertThat(model.path("relaciones")).hasSize(1);
        verify(audit).registrarAccion(eq(actor), eq(project), eq("APLICAR_RECOMENDACIONES_LOTE"), contains("2"));
    }

    @Test
    void aplicaRelacionConMultiplicidadesResuelveNombresAUuidYPublicaModeloPersistido() throws Exception {
        diagram.setModeloJson("""
                {"clases":[
                  {"id":"usuario-uuid","nombre":"Usuario","atributos":[],"metodos":[]},
                  {"id":"libro-uuid","nombre":"Libro","atributos":[],"metodos":[]}
                ],"relaciones":[]}
                """);
        message.setMetadatos("""
                {"recomendaciones":[
                  {"id":"rec-rel","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_RELACION","descripcion":"Relación recomendada: Usuario — Libro","elementoAfectado":{"tipo":"CLASE","id":"usuario-uuid","nombre":"Usuario"},"cambioPropuesto":{"origen":"Usuario","destino":"Libro","tipo":"ASOCIACION","nombre":"prestamos","multiplicidadOrigen":"0..*","multiplicidadDestino":"1","justificacion":"Registrar la navegación entre conceptos"}}
                ]}
                """);

        var response = service.aplicar(2L, "rec-rel", new AplicarRecomendacionRequest(20L), "elena@test");
        JsonNode relation = mapper.readTree(response.modeloJson()).path("relaciones").get(0);

        assertThat(relation.path("id").asText()).isNotBlank();
        assertThat(relation.path("origen").asText()).isEqualTo("usuario-uuid");
        assertThat(relation.path("destino").asText()).isEqualTo("libro-uuid");
        assertThat(relation.path("multiplicidadOrigen").asText()).isEqualTo("0..*");
        assertThat(relation.path("multiplicidadDestino").asText()).isEqualTo("1");
        verify(events).publishEvent(isA(DiagramaActualizadoEvent.class));
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

    @Test
    void creaClaseConIdsGeneradosPorBackendMiembrosYRelacion() throws Exception {
        diagram.setModeloJson("{\"clases\":[{\"id\":\"c1\",\"nombre\":\"Venta\",\"atributos\":[],\"metodos\":[]}],\"relaciones\":[]}");
        message.setMetadatos("""
                {"recomendaciones":[{"id":"rec-clase","diagramaId":4,"versionDiagrama":3,"tipoCambio":"AGREGAR_CLASE","descripcion":"Agregar Pago","elementoAfectado":{"tipo":"CLASE","id":"","nombre":"Pago"},"cambioPropuesto":{"nombre":"Pago","posicionX":300,"posicionY":140,"atributos":[{"nombre":"monto","tipo":"Decimal"}],"metodos":[{"nombre":"confirmar","tipoRetorno":"void"}],"relaciones":[{"destino":"c1","tipo":"ASOCIACION","multiplicidadOrigen":"0..*","multiplicidadDestino":"1"}]}}]}
                """);

        var response = service.aplicar(2L, "rec-clase", new AplicarRecomendacionRequest(20L), "elena@test");
        JsonNode model = mapper.readTree(response.modeloJson());

        assertThat(model.path("clases")).hasSize(2);
        JsonNode created = model.path("clases").get(1);
        assertThat(created.path("id").asText()).isNotBlank().isNotEqualTo("c1");
        assertThat(created.path("atributos").get(0).path("id").asText()).isNotBlank();
        assertThat(created.path("metodos").get(0).path("id").asText()).isNotBlank();
        assertThat(model.path("relaciones").get(0).path("origen").asText()).isEqualTo(created.path("id").asText());
    }

    @Test
    void eliminarClaseExigeConfirmacionEspecialYEliminaRelacionesDependientes() throws Exception {
        diagram.setModeloJson("{\"clases\":[{\"id\":\"c1\",\"nombre\":\"Cliente\",\"atributos\":[],\"metodos\":[]},{\"id\":\"c2\",\"nombre\":\"Venta\",\"atributos\":[],\"metodos\":[]}],\"relaciones\":[{\"id\":\"r1\",\"origen\":\"c1\",\"destino\":\"c2\",\"tipo\":\"ASOCIACION\"}]}");
        message.setMetadatos("""
                {"recomendaciones":[{"id":"rec-delete","diagramaId":4,"versionDiagrama":3,"tipoCambio":"ELIMINAR_CLASE","descripcion":"Eliminar Cliente","elementoAfectado":{"tipo":"CLASE","id":"c1","nombre":"Cliente"},"cambioPropuesto":{}}]}
                """);

        assertThatThrownBy(() -> service.aplicar(2L, "rec-delete", new AplicarRecomendacionRequest(20L), "elena@test"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value()).isEqualTo(422);

        var response = service.aplicar(2L, "rec-delete", new AplicarRecomendacionRequest(20L, true), "elena@test");
        JsonNode model = mapper.readTree(response.modeloJson());
        assertThat(model.path("clases")).hasSize(1);
        assertThat(model.path("relaciones")).isEmpty();
    }

    @Test
    void rechazaActorSinPermisoDeEdicion() {
        Rol observer = new Rol(); observer.setNombre("OBSERVADOR"); actor.setRol(observer);
        assertThatThrownBy(() -> service.aplicar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "externo@test"))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(diagrams, never()).saveAndFlush(any());
    }

    @Test
    void descartaRecomendacionPersistiendoEstadoYAuditoriaSinMutarDiagrama() throws Exception {
        service.descartar(2L, "rec-1", new AplicarRecomendacionRequest(20L), "elena@test");

        assertThat(mapper.readTree(message.getMetadatos()).path("recomendacionesDescartadasIds").toString())
                .isEqualTo("[\"rec-1\"]");
        verify(messages).saveAndFlush(message);
        verify(audit).registrarAccion(eq(actor), eq(project), eq("DESCARTAR_RECOMENDACION_IA"), anyString());
        verify(chat).persistirMensajeInterno(eq(project), eq(TipoEmisorChat.SISTEMA), contains("descarto"),
                eq(EstadoMensajeChat.COMPLETADO), any(), any());
        verifyNoInteractions(diagrams, events);
    }
}
