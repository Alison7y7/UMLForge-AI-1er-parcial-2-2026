package com.umlforge.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

public class UsuarioListResponse {
    private Long id;
    private String nombre;
    private String apellido;
    private String correo;
    private Boolean activo;
    private String rol;
    private List<String> permisos;
    private LocalDateTime fechaCreacion;

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public Boolean getActivo() { return activo; }
    public void setActivo(Boolean activo) { this.activo = activo; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public List<String> getPermisos() { return permisos; }
    public void setPermisos(List<String> permisos) { this.permisos = permisos; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
