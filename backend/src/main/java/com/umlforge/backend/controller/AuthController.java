package com.umlforge.backend.controller;

import com.umlforge.backend.dto.AuthResponse;
import com.umlforge.backend.dto.LoginRequest;
import com.umlforge.backend.dto.RegisterRequest;
import com.umlforge.backend.dto.UserResponse;
import com.umlforge.backend.entity.Rol;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.RolRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import com.umlforge.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.getCorreo() == null || request.getCorreo().trim().isEmpty() ||
            request.getPassword() == null || request.getPassword().isEmpty() ||
            request.getNombre() == null || request.getNombre().trim().isEmpty() ||
            request.getApellido() == null || request.getApellido().trim().isEmpty() ||
            request.getRol() == null || request.getRol().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Todos los campos son obligatorios.");
        }

        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("El correo ya está registrado.");
        }

        String rolNombre = request.getRol().toUpperCase();
        if (!rolNombre.equals("ANFITRION") && !rolNombre.equals("COLABORADOR")) {
            return ResponseEntity.badRequest().body("Rol no permitido. Debe ser ANFITRION o COLABORADOR.");
        }

        Rol rol = rolRepository.findByNombre(rolNombre)
                .orElseThrow(() -> new RuntimeException("Rol no encontrado"));

        Usuario usuario = new Usuario();
        usuario.setNombre(request.getNombre());
        usuario.setApellido(request.getApellido());
        usuario.setCorreo(request.getCorreo());
        usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(rol);
        if (rol.getPermisos() != null) {
            usuario.setPermisos(new java.util.HashSet<>(rol.getPermisos()));
        }
        usuario.setActivo(true);
        usuario.setFechaCreacion(LocalDateTime.now());
        usuario.setFechaActualizacion(LocalDateTime.now());

        usuarioRepository.save(usuario);

        return ResponseEntity.status(HttpStatus.CREATED).body("Usuario registrado correctamente.");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getCorreo(), request.getPassword())
        );
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(userDetails);
        
        Usuario usuario = usuarioRepository.findByCorreo(request.getCorreo())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        java.util.List<String> permisos = userDetails.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(auth -> !auth.startsWith("ROLE_"))
                .toList();
        
        AuthResponse response = new AuthResponse(
                token,
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getCorreo(),
                usuario.getRol() != null ? usuario.getRol().getNombre() : null,
                permisos
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(Authentication authentication) {
        Usuario usuario = usuarioRepository.findByCorreo(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
                
        java.util.List<String> permisos = authentication.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(auth -> !auth.startsWith("ROLE_"))
                .toList();
                
        UserResponse response = new UserResponse();
        response.setId(usuario.getId());
        response.setNombre(usuario.getNombre());
        response.setApellido(usuario.getApellido());
        response.setCorreo(usuario.getCorreo());
        response.setRol(usuario.getRol() != null ? usuario.getRol().getNombre() : null);
        response.setPermisos(permisos);
        
        return ResponseEntity.ok(response);
    }
}
