package com.umlforge.backend.service;

import com.umlforge.backend.dto.DiagramaRequest;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DiagramaServiceTest {
    private final DiagramaRepository diagrams = mock(DiagramaRepository.class);
    private final ProyectoRepository projects = mock(ProyectoRepository.class);
    private final BitacoraService audit = mock(BitacoraService.class);
    private final ProjectAccessService access = mock(ProjectAccessService.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private DiagramaService service;
    private Diagrama diagram;
    private Usuario actor;

    @BeforeEach
    void setup() {
        service = new DiagramaService(diagrams, projects, audit, access, events);
        Proyecto project = new Proyecto();
        project.setId(2L);
        Rol role = new Rol();
        role.setNombre("COLABORADOR");
        actor = new Usuario();
        actor.setId(7L);
        actor.setNombre("Elena");
        actor.setApellido("Colaborador");
        actor.setRol(role);
        diagram = new Diagrama();
        diagram.setId(4L);
        diagram.setProyecto(project);
        diagram.setNombre("Ventas");
        diagram.setVersion(3L);
        diagram.setModeloJson("{\"clases\":[],\"relaciones\":[]}");
        when(diagrams.findByIdForUpdate(4L)).thenReturn(Optional.of(diagram));
        when(diagrams.saveAndFlush(diagram)).thenAnswer(invocation -> {
            diagram.setVersion(4L);
            return diagram;
        });
    }

    @Test
    void flushesVersionAndPublishesCommittedModelEvent() {
        DiagramaRequest request = new DiagramaRequest();
        request.setNombre("Ventas actualizado");
        request.setModeloJson("{\"clases\":[{\"id\":\"c1\"}],\"relaciones\":[]}");
        request.setVersion(3L);
        request.setChangeId("change-123");

        var response = service.modificarDiagrama(4L, request, actor);

        assertThat(response.getVersion()).isEqualTo(4L);
        verify(diagrams).saveAndFlush(diagram);
        verify(events).publishEvent(argThat((Object value) -> {
            DiagramaActualizadoEvent event = (DiagramaActualizadoEvent) value;
            return event.diagramaId().equals(4L)
                    && event.version().equals(4L)
                    && event.changeId().equals("change-123")
                    && event.updateType().equals("MANUAL")
                    && event.modeloJson().equals(request.getModeloJson());
        }));
    }

    @Test
    void rejectsStaleVersionWithoutPersistingOrPublishing() {
        DiagramaRequest request = new DiagramaRequest();
        request.setNombre("Ventas");
        request.setModeloJson(diagram.getModeloJson());
        request.setVersion(2L);

        assertThatThrownBy(() -> service.modificarDiagrama(4L, request, actor))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode().value())
                .isEqualTo(409);
        verify(diagrams, never()).saveAndFlush(any());
        verifyNoInteractions(events);
    }
}
