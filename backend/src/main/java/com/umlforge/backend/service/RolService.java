package com.umlforge.backend.service;

import com.umlforge.backend.dto.RolRequest;
import com.umlforge.backend.dto.RolResponse;
import com.umlforge.backend.dto.PermisoResponse;
import com.umlforge.backend.entity.Permiso;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.repository.PermisoRepository;
import com.umlforge.backend.repository.RolRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolService {
    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final BitacoraService bitacoraService;

    public List<RolResponse> listarRoles() {
        return rolRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<PermisoResponse> listarPermisos() {
        return permisoRepository.findAll().stream().map(p -> {
            PermisoResponse pr = new PermisoResponse();
            pr.setId(p.getId());
            pr.setCodigo(p.getCodigo());
            pr.setNombre(p.getNombre());
            pr.setDescripcion(p.getDescripcion());
            pr.setActivo(p.getActivo());
            return pr;
        }).collect(Collectors.toList());
    }

    @Transactional
    public RolResponse crearRol(RolRequest request, List<String> permisos, com.umlforge.backend.entity.Usuario actor) {
        if (rolRepository.findByNombre(request.getNombre()).isPresent()) {
            throw new RuntimeException("El rol ya existe.");
        }
        if (permisos == null || permisos.isEmpty()) {
            throw new RuntimeException("Selecciona al menos un permiso.");
        }
        Rol rol = new Rol();
        rol.setNombre(request.getNombre());
        rol.setDescripcion(request.getDescripcion());
        rol.setActivo(request.getActivo() != null ? request.getActivo() : true);
        rol.setFechaCreacion(LocalDateTime.now());
        
        Set<Permiso> permisosSet = permisos.stream()
                .map(cod -> permisoRepository.findByCodigo(cod).orElseThrow(() -> new RuntimeException("Permiso no existe")))
                .collect(Collectors.toSet());
        rol.setPermisos(permisosSet);

        Rol guardado = rolRepository.save(rol);
        bitacoraService.registrarAccion(actor, null, "CREAR_ROL", "Creó el rol " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    @Transactional
    public RolResponse modificarRol(Long id, RolRequest request, com.umlforge.backend.entity.Usuario actor) {
        Rol rol = rolRepository.findById(id).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        rol.setNombre(request.getNombre());
        rol.setDescripcion(request.getDescripcion());
        if (request.getActivo() != null) {
            rol.setActivo(request.getActivo());
        }
        
        Rol guardado = rolRepository.save(rol);
        bitacoraService.registrarAccion(actor, null, "MODIFICAR_ROL", "Modificó el rol " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    @Transactional
    public RolResponse actualizarPermisos(Long id, List<String> codigos, com.umlforge.backend.entity.Usuario actor) {
        Rol rol = rolRepository.findById(id).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        if (codigos == null || codigos.isEmpty()) {
            throw new RuntimeException("Selecciona al menos un permiso.");
        }
        Set<Permiso> permisosSet = codigos.stream()
                .map(cod -> permisoRepository.findByCodigo(cod).orElseThrow(() -> new RuntimeException("Permiso no existe")))
                .collect(Collectors.toSet());
        
        if (rol.getNombre().equals("ADMIN")) {
            long essentialCount = codigos.stream().filter(c -> c.equals("GESTIONAR_ROLES") || c.equals("GESTIONAR_USUARIOS")).count();
            if (essentialCount < 2) {
                throw new RuntimeException("No puedes quitar permisos administrativos esenciales a ADMIN.");
            }
        }

        rol.setPermisos(permisosSet);
        Rol guardado = rolRepository.save(rol);
        bitacoraService.registrarAccion(actor, null, "MODIFICAR_PERMISOS_ROL", "Actualizó permisos del rol " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    @Transactional
    public RolResponse cambiarEstadoRol(Long id, boolean activo, com.umlforge.backend.entity.Usuario actor) {
        Rol rol = rolRepository.findById(id).orElseThrow(() -> new RuntimeException("Rol no encontrado"));
        if (!activo && rol.getNombre().equals("ADMIN")) {
            throw new RuntimeException("No se puede desactivar el rol ADMIN");
        }
        rol.setActivo(activo);
        Rol guardado = rolRepository.save(rol);
        bitacoraService.registrarAccion(actor, null, "CAMBIAR_ESTADO_ROL", (activo ? "Activó" : "Desactivó") + " el rol " + guardado.getNombre());
        return mapToResponse(guardado);
    }

    private RolResponse mapToResponse(Rol rol) {
        RolResponse res = new RolResponse();
        res.setId(rol.getId());
        res.setNombre(rol.getNombre());
        res.setDescripcion(rol.getDescripcion());
        res.setActivo(rol.getActivo());
        res.setFechaCreacion(rol.getFechaCreacion());
        if (rol.getPermisos() != null) {
            res.setPermisos(rol.getPermisos().stream().map(Permiso::getCodigo).collect(Collectors.toList()));
        } else {
            res.setPermisos(java.util.Collections.emptyList());
        }
        return res;
    }
}
