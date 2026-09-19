package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "invitacion_proyecto", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"proyecto_id", "usuario_invitado_id"})
})
public class InvitacionProyecto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proyecto_id", nullable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "anfitrion_id", nullable = false)
    private Usuario anfitrion; // quien crea la invitación

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_invitado_id", nullable = false)
    private Usuario usuarioInvitado;

    @Column(nullable = false, unique = true)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitacionEstado estado;

    @Column(nullable = false)
    private LocalDateTime fechaCreacion;

    private LocalDateTime fechaExpiracion; // opcional

  
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Proyecto getProyecto() { return proyecto; }
    public void setProyecto(Proyecto proyecto) { this.proyecto = proyecto; }
    public Usuario getAnfitrion() { return anfitrion; }
    public void setAnfitrion(Usuario anfitrion) { this.anfitrion = anfitrion; }
    public Usuario getUsuarioInvitado() { return usuarioInvitado; }
    public void setUsuarioInvitado(Usuario usuarioInvitado) { this.usuarioInvitado = usuarioInvitado; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public InvitacionEstado getEstado() { return estado; }
    public void setEstado(InvitacionEstado estado) { this.estado = estado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
}
