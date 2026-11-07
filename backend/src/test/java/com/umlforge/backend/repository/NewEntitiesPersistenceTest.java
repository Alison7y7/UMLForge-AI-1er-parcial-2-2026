package com.umlforge.backend.repository;

import com.umlforge.backend.entity.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NewEntitiesPersistenceTest {

    @Autowired
    private PeticionIARepository peticionIARepository;

    @Autowired
    private AnalisisImagenRepository analisisImagenRepository;

    @Autowired
    private SincronizacionRepository sincronizacionRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ProyectoRepository proyectoRepository;

    @Autowired
    private DiagramaRepository diagramaRepository;

    @Autowired
    private MensajeChatProyectoRepository mensajeChatProyectoRepository;

    @Autowired
    private SolicitudIAChatProyectoRepository solicitudIAChatProyectoRepository;

    @Test
    void testSaveAndRecoverCollaborativeAiRequest() {
        Usuario user = new Usuario();
        user.setNombre("AI");
        user.setApellido("Requester");
        user.setCorreo("ai-request-persistence@test.com");
        user.setPassword("password");
        user.setActivo(true);
        user = usuarioRepository.saveAndFlush(user);

        Proyecto proyecto = new Proyecto();
        proyecto.setNombre("AI project");
        proyecto.setAnfitrion(user);
        proyecto.setActivo(true);
        proyecto = proyectoRepository.saveAndFlush(proyecto);

        Diagrama diagrama = new Diagrama();
        diagrama.setNombre("AI diagram");
        diagrama.setProyecto(proyecto);
        diagrama.setActivo(true);
        diagrama.setModeloJson("{\"clases\":[],\"relaciones\":[]}");
        diagrama = diagramaRepository.saveAndFlush(diagrama);

        MensajeChatProyecto pregunta = new MensajeChatProyecto();
        pregunta.setProyecto(proyecto);
        pregunta.setUsuarioEmisor(user);
        pregunta.setTipoEmisor(TipoEmisorChat.USUARIO);
        pregunta.setContenido("Revisa el diagrama");
        pregunta.setEstado(EstadoMensajeChat.ENVIADO);
        pregunta = mensajeChatProyectoRepository.saveAndFlush(pregunta);

        SolicitudIAChatProyecto solicitud = new SolicitudIAChatProyecto();
        solicitud.setSolicitudId("550e8400-e29b-41d4-a716-446655440000");
        solicitud.setProyecto(proyecto);
        solicitud.setDiagrama(diagrama);
        solicitud.setMensajeUsuario(pregunta);
        solicitud.setSolicitante(user);
        solicitud.setEstado(EstadoSolicitudIAChat.PROCESANDO);
        assertThat(solicitudIAChatProyectoRepository.bloquearProyecto(proyecto.getId())).isEqualTo(1);
        solicitudIAChatProyectoRepository.saveAndFlush(solicitud);

        assertThat(solicitudIAChatProyectoRepository.findByProyectoIdAndSolicitudId(
                proyecto.getId(), solicitud.getSolicitudId())).isPresent();
    }

    @Test
    void testSaveAndRecoverProjectChatMessage() {
        Usuario user = new Usuario();
        user.setNombre("Chat");
        user.setApellido("User");
        user.setCorreo("chat-persistence@test.com");
        user.setPassword("password");
        user.setActivo(true);
        user = usuarioRepository.saveAndFlush(user);

        Proyecto proyecto = new Proyecto();
        proyecto.setNombre("Chat project");
        proyecto.setAnfitrion(user);
        proyecto.setActivo(true);
        proyecto = proyectoRepository.saveAndFlush(proyecto);

        MensajeChatProyecto mensaje = new MensajeChatProyecto();
        mensaje.setProyecto(proyecto);
        mensaje.setUsuarioEmisor(user);
        mensaje.setTipoEmisor(TipoEmisorChat.USUARIO);
        mensaje.setContenido("Mensaje persistente");
        mensaje.setEstado(EstadoMensajeChat.ENVIADO);
        MensajeChatProyecto saved = mensajeChatProyectoRepository.saveAndFlush(mensaje);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getFechaHora()).isNotNull();
        assertThat(saved.getCorrelacionId()).isNotBlank();
        assertThat(mensajeChatProyectoRepository.findByProyectoId(
                proyecto.getId(), org.springframework.data.domain.PageRequest.of(0, 10)).getContent())
                .extracting(MensajeChatProyecto::getContenido)
                .contains("Mensaje persistente");
    }

    @Test
    void testSavePeticionIA() {
        Usuario user = new Usuario();
        user.setNombre("Test");
        user.setApellido("User");
        user.setCorreo("test@test.com");
        user.setPassword("password");
        user.setActivo(true);
        user = usuarioRepository.saveAndFlush(user);

        PeticionIA peticion = new PeticionIA();
        peticion.setUsuario(user);
        peticion.setOrigen(OrigenPeticion.TEXTO_WEB);
        peticion.setPromptTexto("crear cliente");
        peticion.setResultadoJson("{}");
        peticion.setExitoso(true);
        peticion.setTokensUsados(150);

        PeticionIA saved = peticionIARepository.save(peticion);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getFechaPeticion()).isNotNull();
        assertThat(saved.getOrigen()).isEqualTo(OrigenPeticion.TEXTO_WEB);
    }

    @Test
    void testSaveAnalisisImagen() {
        Usuario user = new Usuario();
        user.setNombre("Test");
        user.setApellido("User");
        user.setCorreo("testimg@test.com");
        user.setPassword("password");
        user.setActivo(true);
        user = usuarioRepository.saveAndFlush(user);

        Proyecto proyecto = new Proyecto();
        proyecto.setNombre("Proj");
        proyecto.setAnfitrion(user);
        proyecto.setActivo(true);
        proyecto = proyectoRepository.saveAndFlush(proyecto);

        AnalisisImagen analisis = new AnalisisImagen();
        analisis.setUsuario(user);
        analisis.setProyecto(proyecto);
        analisis.setRutaImagen("s3://bucket/img.png");
        analisis.setEstado(EstadoAnalisis.SUBIDA);

        AnalisisImagen saved = analisisImagenRepository.save(analisis);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getFechaSubida()).isNotNull();
        assertThat(saved.getEstado()).isEqualTo(EstadoAnalisis.SUBIDA);
    }

    @Test
    void testSaveSincronizacion() {
        Usuario user = new Usuario();
        user.setNombre("Test");
        user.setApellido("User");
        user.setCorreo("testsync@test.com");
        user.setPassword("password");
        user.setActivo(true);
        user = usuarioRepository.saveAndFlush(user);

        Proyecto proyecto = new Proyecto();
        proyecto.setNombre("Proj Sync");
        proyecto.setAnfitrion(user);
        proyecto.setActivo(true);
        proyecto = proyectoRepository.saveAndFlush(proyecto);

        Diagrama diagrama = new Diagrama();
        diagrama.setNombre("Diag 1");
        diagrama.setProyecto(proyecto);
        diagrama.setActivo(true);
        diagrama = diagramaRepository.saveAndFlush(diagrama);

        Sincronizacion sync = new Sincronizacion();
        sync.setUsuario(user);
        sync.setDiagrama(diagrama);
        sync.setModeloJsonCliente("{ \"classes\": [] }");
        sync.setVersionCliente(2L);
        sync.setVersionServidor(3L);
        sync.setEstadoResolucion(EstadoSincronizacion.PENDIENTE_MERGE);

        Sincronizacion saved = sincronizacionRepository.save(sync);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getFechaColision()).isNotNull();
        assertThat(saved.getEstadoResolucion()).isEqualTo(EstadoSincronizacion.PENDIENTE_MERGE);
    }
}
