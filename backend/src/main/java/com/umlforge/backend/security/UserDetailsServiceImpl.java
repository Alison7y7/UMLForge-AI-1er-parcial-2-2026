package com.umlforge.backend.security;

import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String correo) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByCorreo(correo)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con el correo: " + correo));

        String rolNombre = usuario.getRol() != null ? "ROLE_" + usuario.getRol().getNombre() : "ROLE_USER";
        
        java.util.Set<org.springframework.security.core.GrantedAuthority> authorities = new java.util.HashSet<>();
        authorities.add(new SimpleGrantedAuthority(rolNombre));
        
        if (usuario.getPermisos() != null && !usuario.getPermisos().isEmpty()) {
            usuario.getPermisos().forEach(p -> {
                authorities.add(new SimpleGrantedAuthority(p.getCodigo()));
            });
        } else if (usuario.getRol() != null && usuario.getRol().getPermisos() != null) {
            usuario.getRol().getPermisos().forEach(p -> {
                authorities.add(new SimpleGrantedAuthority(p.getCodigo()));
            });
        }

        return new org.springframework.security.core.userdetails.User(
                usuario.getCorreo(),
                usuario.getPassword(),
                authorities
        );
    }
}
