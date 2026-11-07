package com.umlforge.backend.service;

import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Permiso;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.ParticipanteProyectoRepository;
import com.umlforge.backend.repository.ProyectoRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class ProjectAccessServiceTest {

    private ProyectoRepository proyectoRepository;
    private ParticipanteProyectoRepository participanteRepository;
    private UsuarioRepository usuarioRepository;
    private ProjectAccessService service;

    @BeforeEach
    void setUp() {
        proyectoRepository = mock(ProyectoRepository.class);
        participanteRepository = mock(ParticipanteProyectoRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        service = new ProjectAccessService(proyectoRepository, mock(DiagramaRepository.class),
                participanteRepository, usuarioRepository);
    }

    @Test
    void anfitrionYParticipanteActivoPuedenAcceder() {
        Usuario anfitrion = usuario(1L, "host@test");
        Usuario colaborador = usuario(2L, "colab@test");
        Proyecto proyecto = proyecto(10L, anfitrion);
        when(proyectoRepository.findById(10L)).thenReturn(Optional.of(proyecto));
        when(participanteRepository.existsByProyectoIdAndUsuarioIdAndActivoTrue(10L, 2L))
                .thenReturn(true);

        assertThat(service.requireProjectAccess(10L, anfitrion)).isSameAs(proyecto);
        assertThat(service.requireProjectAccess(10L, colaborador)).isSameAs(proyecto);
    }

    @Test
    void usuarioAjenoNoPuedeCruzarConversaciones() {
        Usuario anfitrion = usuario(1L, "host@test");
        Usuario ajeno = usuario(3L, "ajeno@test");
        Proyecto proyecto = proyecto(10L, anfitrion);
        when(proyectoRepository.findById(10L)).thenReturn(Optional.of(proyecto));

        assertThatThrownBy(() -> service.requireProjectAccess(10L, ajeno))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void permisoGestionarProyectosNoDaAccesoGlobalAUnAnfitrion() {
        Usuario propietario = usuario(1L, "propietario@test");
        Usuario anfitrionAjeno = usuario(2L, "otro-host@test");
        Rol rol = new Rol();
        rol.setNombre("ANFITRION");
        anfitrionAjeno.setRol(rol);
        Permiso permiso = new Permiso();
        permiso.setCodigo("GESTIONAR_PROYECTOS");
        anfitrionAjeno.setPermisos(Set.of(permiso));
        Proyecto proyecto = proyecto(10L, propietario);
        when(proyectoRepository.findById(10L)).thenReturn(Optional.of(proyecto));

        assertThatThrownBy(() -> service.requireProjectAccess(10L, anfitrionAjeno))
                .isInstanceOf(AccessDeniedException.class);
    }

    private Usuario usuario(Long id, String correo) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setCorreo(correo);
        return usuario;
    }

    private Proyecto proyecto(Long id, Usuario anfitrion) {
        Proyecto proyecto = new Proyecto();
        proyecto.setId(id);
        proyecto.setAnfitrion(anfitrion);
        return proyecto;
    }
}
