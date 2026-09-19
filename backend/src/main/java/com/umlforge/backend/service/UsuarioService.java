package com.umlforge.backend.service;

import com.umlforge.backend.dto.UsuarioListResponse;
import com.umlforge.backend.dto.UsuarioRequest;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.RolRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UsuarioService {
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;
    private final BitacoraService bitacoraService;

    public List<UsuarioListResponse> listarUsuarios() {
        return usuarioRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public UsuarioListResponse obtenerUsuario(Long id) {
        return usuarioRepository.findById(id).map(this::mapToResponse)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
    }

    @Transactional
    public UsuarioListResponse crearUsuario(UsuarioRequest request, Usuario actor) {
        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("El correo ya está en uso");
        }
        
        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        usuario.setCorreo(request.getCorreo());
        usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuario.setActivo(request.getActivo() != null ? request.getActivo() : true);
        usuario.setFechaCreacion(LocalDateTime.now());
        usuario.setFechaActualizacion(LocalDateTime.now());

        if (request.getRolId() != null) {
            Rol rol = rolRepository.findById(request.getRolId())
                    .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
            usuario.setRol(rol);
            if (rol.getPermisos() != null) {
                usuario.setPermisos(new java.util.HashSet<>(rol.getPermisos()));
            }
        }

        Usuario guardado = usuarioRepository.save(usuario);
        bitacoraService.registrarAccion(actor, null, "CREAR_USUARIO", "Creó el usuario " + guardado.getCorreo());
        return mapToResponse(guardado);
    }

    @Transactional
    public UsuarioListResponse modificarUsuario(Long id, UsuarioRequest request, Usuario actor) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        if (request.getCorreo() != null && !usuario.getCorreo().equals(request.getCorreo())) {
            if (usuarioRepository.existsByCorreo(request.getCorreo())) {
                throw new RuntimeException("El correo ya está en uso");
            }
            usuario.setCorreo(request.getCorreo());
        }
        
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRolId() != null && (usuario.getRol() == null || !usuario.getRol().getId().equals(request.getRolId()))) {
            Rol rol = rolRepository.findById(request.getRolId())
                    .orElseThrow(() -> new RuntimeException("Rol no encontrado"));
            usuario.setRol(rol);
            if (rol.getPermisos() != null) {
                usuario.setPermisos(new java.util.HashSet<>(rol.getPermisos()));
            }
        }
        
        if (request.getActivo() != null) {
            usuario.setActivo(request.getActivo());
        }
        
        usuario.setFechaActualizacion(LocalDateTime.now());
        Usuario guardado = usuarioRepository.save(usuario);
        bitacoraService.registrarAccion(actor, null, "MODIFICAR_USUARIO", "Modificó el usuario " + guardado.getCorreo());
        return mapToResponse(guardado);
    }

    @Transactional
    public UsuarioListResponse cambiarAccesosUsuario(Long id, Long rolId, List<String> permisos, Usuario actor, com.umlforge.backend.repository.PermisoRepository permisoRepository) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        if (rolId != null) {
            Rol rol = rolRepository.findById(rolId).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
            if (usuario.getRol() == null || !usuario.getRol().getId().equals(rolId)) {
                usuario.setRol(rol);
                bitacoraService.registrarAccion(actor, null, "CAMBIAR_ROL_USUARIO", "Cambió rol del usuario " + usuario.getCorreo() + " a " + rol.getNombre());
            }
        }
        
        if (permisos != null) {
            if (actor.getId().equals(id)) {
                long adminCount = permisos.stream().filter(p -> p.equals("GESTIONAR_ROLES") || p.equals("GESTIONAR_USUARIOS")).count();
                if (adminCount < 2) {
                    throw new RuntimeException("No puedes quitarte a ti mismo los permisos administrativos esenciales.");
                }
            }
            java.util.Set<com.umlforge.backend.entity.Permiso> nuevosPermisos = permisos.stream()
                .map(cod -> permisoRepository.findByCodigo(cod).orElseThrow(() -> new RuntimeException("Permiso no existe")))
                .collect(Collectors.toSet());
            usuario.setPermisos(nuevosPermisos);
            bitacoraService.registrarAccion(actor, null, "MODIFICAR_PERMISOS_USUARIO", "Actualizó permisos de " + usuario.getCorreo());
        }
        
        usuario.setFechaActualizacion(LocalDateTime.now());
        Usuario guardado = usuarioRepository.save(usuario);
        return mapToResponse(guardado);
    }

    @Transactional
    public UsuarioListResponse cambiarEstadoUsuario(Long id, boolean activo, Usuario actor) {
        if (!activo && actor.getId().equals(id)) {
            throw new RuntimeException("No puedes desactivar tu propio usuario");
        }
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        usuario.setActivo(activo);
        usuario.setFechaActualizacion(LocalDateTime.now());
        Usuario guardado = usuarioRepository.save(usuario);
        bitacoraService.registrarAccion(actor, null, "CAMBIAR_ESTADO_USUARIO", (activo ? "Activó" : "Desactivó") + " el usuario " + guardado.getCorreo());
        return mapToResponse(guardado);
    }

    @Transactional
    public void eliminarUsuario(Long id, Usuario actor) {
        if (actor.getId().equals(id)) {
            throw new RuntimeException("No puedes eliminar tu propio usuario");
        }
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        try {
            usuarioRepository.delete(usuario);
            bitacoraService.registrarAccion(actor, null, "ELIMINAR_USUARIO", "Eliminó el usuario " + usuario.getCorreo());
        } catch (Exception e) {
            throw new RuntimeException("No se puede eliminar este usuario porque tiene información asociada");
        }
    }

    private UsuarioListResponse mapToResponse(Usuario u) {
        UsuarioListResponse res = new UsuarioListResponse();
        res.setId(u.getId());
        res.setNombre(u.getNombre());
        res.setApellido(u.getApellido());
        res.setCorreo(u.getCorreo());
        res.setActivo(u.getActivo());
        res.setRol(u.getRol() != null ? u.getRol().getNombre() : null);
        res.setFechaCreacion(u.getFechaCreacion());
        res.setPermisos(u.getPermisos() != null ? u.getPermisos().stream().map(com.umlforge.backend.entity.Permiso::getCodigo).toList() : java.util.Collections.emptyList());
        return res;
    }
}
