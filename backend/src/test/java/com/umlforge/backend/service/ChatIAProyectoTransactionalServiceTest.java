package com.umlforge.backend.service;

import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.dto.SolicitudIAChatRequest;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.BitacoraRepository;
import com.umlforge.backend.repository.MensajeChatProyectoRepository;
import com.umlforge.backend.repository.SolicitudIAChatProyectoRepository;
import com.umlforge.backend.service.ia.chat.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ChatIAProyectoTransactionalServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private ProjectAccessService access;
    private MensajeChatProyectoRepository mensajes;
    private SolicitudIAChatProyectoRepository solicitudes;
    private BitacoraRepository bitacora;
    private ChatProyectoService chat;
    private Usuario usuario;
    private Proyecto proyecto;
    private Diagrama diagrama;
    private MensajeChatProyecto pregunta;

    @BeforeEach
    void setup() {
        access = mock(ProjectAccessService.class);
        mensajes = mock(MensajeChatProyectoRepository.class);
        solicitudes = mock(SolicitudIAChatProyectoRepository.class);
        bitacora = mock(BitacoraRepository.class);
        chat = mock(ChatProyectoService.class);
        usuario = new Usuario(); usuario.setId(5L); usuario.setCorreo("ada@test");
        proyecto = new Proyecto(); proyecto.setId(9L);
        diagrama = new Diagrama(); diagrama.setId(7L); diagrama.setProyecto(proyecto);
        diagrama.setActivo(true); diagrama.setNombre("Dominio"); diagrama.setVersion(4L);
        diagrama.setModeloJson("{\"clases\":[{\"id\":\"c1\",\"nombre\":\"Cliente\",\"atributos\":[],\"metodos\":[]}],\"relaciones\":[]}");
        pregunta = new MensajeChatProyecto(); pregunta.setId(21L); pregunta.setProyecto(proyecto);
        pregunta.setUsuarioEmisor(usuario); pregunta.setTipoEmisor(TipoEmisorChat.USUARIO);
        pregunta.setContenido("Revisa Cliente"); pregunta.setCorrelacionId("corr-1");
        when(access.requireUser("ada@test")).thenReturn(usuario);
        when(access.requireProjectAccess(9L, usuario)).thenReturn(proyecto);
        when(access.requireDiagramAccess(7L, "ada@test")).thenReturn(diagrama);
        when(solicitudes.findByProyectoIdAndSolicitudId(anyLong(), anyString())).thenReturn(Optional.empty());
        when(mensajes.findById(21L)).thenReturn(Optional.of(pregunta));
        when(mensajes.findByProyectoIdOrderByFechaHoraDescIdDesc(eq(9L), any(Pageable.class))).thenReturn(List.of(pregunta));
        when(bitacora.findByProyectoIdOrderByFechaHoraDesc(eq(9L), any(Pageable.class))).thenReturn(List.of());
        when(mensajes.getReferenceById(100L)).thenReturn(new MensajeChatProyecto());
    }

    @Test
    void usaPipelinePorPrioridadConContextoRealYPersisteIdentidadIa() {
        ChatIAProvider primero = provider("gemini", 10, true);
        when(primero.generate(anyString())).thenThrow(new ChatIAProviderException("temporal"));
        ChatIAProvider segundo = provider("groq", 20, true);
        when(segundo.generate(anyString())).thenReturn(new ChatIAProviderResult(
                "{\"respuesta\":\"Cliente necesita email\",\"recomendaciones\":[{\"tipoCambio\":\"AGREGAR_ATRIBUTO\",\"descripcion\":\"Agregar email\",\"elementoTipo\":\"CLASE\",\"elementoId\":\"c1\",\"cambioPropuesto\":{\"nombre\":\"email\",\"tipo\":\"String\"}}]}", 12));
        MensajeChatResponse ia = new MensajeChatResponse(100L, 9L, null, "UMLForge IA",
                TipoEmisorChat.IA, "Cliente necesita email", LocalDateTime.now(),
                EstadoMensajeChat.COMPLETADO, "corr-1", null);
        when(chat.persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.IA), anyString(),
                eq(EstadoMensajeChat.COMPLETADO), eq("corr-1"), any(JsonNode.class))).thenReturn(ia);
        var service = service(List.of(segundo, primero));

        var result = service.procesar(9L, request(), "ada@test");

        assertThat(result.proveedor()).isEqualTo("groq");
        verify(primero).generate(argThat(p -> p.contains("\"id\":\"c1\"") && p.contains("Revisa Cliente")));
        verify(segundo).generate(anyString());
        verify(chat).persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.IA),
                eq("Cliente necesita email"), eq(EstadoMensajeChat.COMPLETADO), eq("corr-1"),
                argThat(meta -> meta.path("recomendaciones").size() == 1
                        && meta.path("diagramaVersion").asLong() == 4));
        verify(solicitudes).bloquearProyecto(9L);
    }

    @Test
    void recorreGeminiGroqOpenRouterYOllamaUnaVezConElMismoContexto() {
        ChatIAProvider gemini = provider("gemini", 10, true);
        ChatIAProvider groq = provider("groq", 20, true);
        ChatIAProvider openrouter = provider("openrouter", 30, true);
        ChatIAProvider ollama = provider("ollama", 40, true);
        when(gemini.generate(anyString())).thenThrow(new ChatIAProviderException("timeout"));
        when(groq.generate(anyString())).thenThrow(new ChatIAProviderException("temporal"));
        when(openrouter.generate(anyString())).thenThrow(new ChatIAProviderException("no disponible"));
        when(ollama.generate(anyString())).thenReturn(new ChatIAProviderResult(
                "{\"respuesta\":\"Respuesta local\",\"recomendaciones\":[]}", 8));
        when(chat.persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.IA), eq("Respuesta local"),
                eq(EstadoMensajeChat.COMPLETADO), eq("corr-1"), any(JsonNode.class)))
                .thenReturn(new MensajeChatResponse(100L, 9L, null, "UMLForge IA",
                        TipoEmisorChat.IA, "Respuesta local", LocalDateTime.now(),
                        EstadoMensajeChat.COMPLETADO, "corr-1", null));

        var result = service(List.of(ollama, openrouter, groq, gemini)).procesar(9L, request(), "ada@test");

        assertThat(result.proveedor()).isEqualTo("ollama");
        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(gemini, times(1)).generate(prompt.capture());
        verify(groq, times(1)).generate(prompt.capture());
        verify(openrouter, times(1)).generate(prompt.capture());
        verify(ollama, times(1)).generate(prompt.capture());
        assertThat(prompt.getAllValues()).allMatch(prompt.getAllValues().get(0)::equals);
        assertThat(prompt.getValue()).contains("Revisa Cliente", "\"id\":\"c1\"");
        verify(chat, times(1)).persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.IA),
                anyString(), eq(EstadoMensajeChat.COMPLETADO), eq("corr-1"), any(JsonNode.class));
    }

    @Test
    void noPermiteUsarMensajeDeOtroUsuario() {
        Usuario otro = new Usuario(); otro.setId(77L); pregunta.setUsuarioEmisor(otro);
        var service = service(List.of(provider("gemini", 10, true)));
        assertThatThrownBy(() -> service.procesar(9L, request(), "ada@test"))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(chat);
    }

    @Test
    void falloTotalPersisteErrorVisibleSinFingirRespuestaIa() {
        ChatIAProvider provider = provider("gemini", 10, true);
        when(provider.generate(anyString())).thenThrow(new ChatIAProviderException("no disponible"));
        MensajeChatResponse error = new MensajeChatResponse(100L, 9L, null, "Sistema",
                TipoEmisorChat.SISTEMA, "error", LocalDateTime.now(), EstadoMensajeChat.ERROR, "corr-1", null);
        when(chat.persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.SISTEMA), anyString(),
                eq(EstadoMensajeChat.ERROR), eq("corr-1"), any(JsonNode.class))).thenReturn(error);
        var result = service(List.of(provider)).procesar(9L, request(), "ada@test");
        assertThat(result.estado()).isEqualTo(EstadoSolicitudIAChat.ERROR);
        verify(chat).persistirMensajeInterno(eq(proyecto), eq(TipoEmisorChat.SISTEMA), anyString(),
                eq(EstadoMensajeChat.ERROR), eq("corr-1"), any(JsonNode.class));
    }

    @Test
    void solicitudRepetidaDevuelveRespuestaPersistidaSinProcesarlaOtraVez() {
        ChatIAProvider provider = provider("gemini", 10, true);
        MensajeChatProyecto respuesta = new MensajeChatProyecto();
        respuesta.setId(100L); respuesta.setProyecto(proyecto); respuesta.setTipoEmisor(TipoEmisorChat.IA);
        respuesta.setContenido("respuesta previa"); respuesta.setEstado(EstadoMensajeChat.COMPLETADO);
        respuesta.setFechaHora(LocalDateTime.now()); respuesta.setCorrelacionId("corr-1");
        SolicitudIAChatProyecto existente = new SolicitudIAChatProyecto();
        existente.setSolicitudId(request().solicitudId()); existente.setProyecto(proyecto);
        existente.setSolicitante(usuario); existente.setEstado(EstadoSolicitudIAChat.COMPLETADA);
        existente.setProveedor("gemini"); existente.setMensajeRespuesta(respuesta);
        when(solicitudes.findByProyectoIdAndSolicitudId(9L, request().solicitudId()))
                .thenReturn(Optional.of(existente));
        when(chat.toResponse(respuesta)).thenReturn(new MensajeChatResponse(100L, 9L, null,
                "UMLForge IA", TipoEmisorChat.IA, "respuesta previa", LocalDateTime.now(),
                EstadoMensajeChat.COMPLETADO, "corr-1", null));

        var result = service(List.of(provider)).procesar(9L, request(), "ada@test");

        assertThat(result.mensaje().contenido()).isEqualTo("respuesta previa");
        verify(provider, never()).generate(anyString());
        verify(chat, never()).persistirMensajeInterno(any(), any(), anyString(), any(), anyString(), any());
    }

    private ChatIAProyectoTransactionalService service(List<ChatIAProvider> providers) {
        return new ChatIAProyectoTransactionalService(access, mensajes, solicitudes, bitacora, chat,
                new ChatIAPromptBuilder(mapper), new ChatIAResponseParser(mapper), providers, mapper);
    }

    private ChatIAProvider provider(String name, int priority, boolean available) {
        ChatIAProvider p = mock(ChatIAProvider.class);
        when(p.getName()).thenReturn(name); when(p.getPriority()).thenReturn(priority);
        when(p.isAvailable()).thenReturn(available); when(p.getUnavailableReason()).thenReturn("sin configurar");
        return p;
    }

    private SolicitudIAChatRequest request() {
        return new SolicitudIAChatRequest(21L, 7L, "550e8400-e29b-41d4-a716-446655440000");
    }
}
