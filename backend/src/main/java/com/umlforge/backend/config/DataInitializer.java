package com.umlforge.backend.config;

import com.umlforge.backend.entity.Permiso;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.PermisoRepository;
import com.umlforge.backend.repository.RolRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // 1. Crear permisos si no existen
        List<String> codigosPermisos = Arrays.asList(
                "GESTIONAR_USUARIOS",
                "GESTIONAR_ROLES",
                "GESTIONAR_PROYECTOS",
                "GESTIONAR_PARTICIPANTES",
                "EDITAR_DIAGRAMAS",
                "CONSULTAR_BITACORA",
                "GENERAR_BACKEND"
        );

        for (String codigo : codigosPermisos) {
            permisoRepository.findByCodigo(codigo).orElseGet(() -> {
                Permiso p = new Permiso();
                p.setCodigo(codigo);
                p.setNombre(codigo.replace("_", " "));
                p.setDescripcion("Permiso para " + codigo.replace("_", " ").toLowerCase());
                return permisoRepository.save(p);
            });
        }

        // Obtener permisos para asignación
        Set<Permiso> todosLosPermisos = Set.copyOf(permisoRepository.findAll());
        Set<Permiso> permisosAnfitrion = todosLosPermisos.stream()
                .filter(p -> Arrays.asList("GESTIONAR_PROYECTOS", "GESTIONAR_PARTICIPANTES", "EDITAR_DIAGRAMAS", "CONSULTAR_BITACORA").contains(p.getCodigo()))
                .collect(Collectors.toSet());
        Set<Permiso> permisosColaborador = todosLosPermisos.stream()
                .filter(p -> p.getCodigo().equals("EDITAR_DIAGRAMAS"))
                .collect(Collectors.toSet());

        // 2. Crear roles
        Rol adminRole = rolRepository.findByNombre("ADMIN").orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre("ADMIN");
            rol.setDescripcion("Administrador del sistema");
            rol.setActivo(true);
            rol.setFechaCreacion(LocalDateTime.now());
            return rolRepository.save(rol);
        });

        // Actualizar permisos de ADMIN si le faltan
        if (adminRole.getPermisos().size() != todosLosPermisos.size()) {
            adminRole.setPermisos(todosLosPermisos);
            rolRepository.save(adminRole);
        }

        Rol anfitrionRole = rolRepository.findByNombre("ANFITRION").orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre("ANFITRION");
            rol.setDescripcion("Anfitrión de proyectos");
            rol.setActivo(true);
            rol.setFechaCreacion(LocalDateTime.now());
            return rolRepository.save(rol);
        });
        
        if (anfitrionRole.getPermisos().isEmpty()) {
            anfitrionRole.setPermisos(permisosAnfitrion);
            rolRepository.save(anfitrionRole);
        }

        Rol colaboradorRole = rolRepository.findByNombre("COLABORADOR").orElseGet(() -> {
            Rol rol = new Rol();
            rol.setNombre("COLABORADOR");
            rol.setDescripcion("Colaborador de proyectos");
            rol.setActivo(true);
            rol.setFechaCreacion(LocalDateTime.now());
            return rolRepository.save(rol);
        });

        if (colaboradorRole.getPermisos().isEmpty()) {
            colaboradorRole.setPermisos(permisosColaborador);
            rolRepository.save(colaboradorRole);
        }

        // 3. Crear usuario ADMIN por defecto
        Usuario admin = usuarioRepository.findByCorreo("admin@umlforge.com").orElseGet(() -> {
            Usuario nuevoAdmin = new Usuario();
            nuevoAdmin.setNombre("Admin");
            nuevoAdmin.setApellido("Sistema");
            nuevoAdmin.setCorreo("admin@umlforge.com");
            nuevoAdmin.setPassword(passwordEncoder.encode("admin123"));
            nuevoAdmin.setActivo(true);
            nuevoAdmin.setRol(adminRole);
            nuevoAdmin.setFechaCreacion(LocalDateTime.now());
            return nuevoAdmin;
        });

        admin.setFechaActualizacion(LocalDateTime.now());
        
        Set<Permiso> todos = Set.copyOf(permisoRepository.findAll());
        if (admin.getPermisos() == null || admin.getPermisos().size() != todos.size()) {
            admin.setPermisos(todos);
        }
        
        usuarioRepository.save(admin);
    }
}
