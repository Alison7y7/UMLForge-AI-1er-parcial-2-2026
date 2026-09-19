package com.umlforge.backend.dto;

import java.time.LocalDateTime;

public class InvitacionResponse {
    private Long id;
    private Long proyectoId;
    private String anfitrionNombre;
    private String emailInvitado;
    private String token;
    private String estado;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaExpiracion;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProyectoId() { return proyectoId; }
    public void setProyectoId(Long proyectoId) { this.proyectoId = proyectoId; }
    public String getAnfitrionNombre() { return anfitrionNombre; }
    public void setAnfitrionNombre(String anfitrionNombre) { this.anfitrionNombre = anfitrionNombre; }
    public String getEmailInvitado() { return emailInvitado; }
    public void setEmailInvitado(String emailInvitado) { this.emailInvitado = emailInvitado; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
    public LocalDateTime getFechaExpiracion() { return fechaExpiracion; }
    public void setFechaExpiracion(LocalDateTime fechaExpiracion) { this.fechaExpiracion = fechaExpiracion; }
}
