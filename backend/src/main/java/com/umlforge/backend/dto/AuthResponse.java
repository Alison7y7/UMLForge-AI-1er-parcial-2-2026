package com.umlforge.backend.dto;

import java.util.List;

public class AuthResponse {
    private String token;
    private Long id;
    private String nombre;
    private String apellido;
    private String correo;
    private String rol;
    private List<String> permisos;

    public AuthResponse(String token, Long id, String nombre, String apellido, String correo, String rol, List<String> permisos) {
        this.token = token;
        this.id = id;
        this.nombre = nombre;
        this.apellido = apellido;
        this.correo = correo;
        this.rol = rol;
        this.permisos = permisos;
    }

    // Getters and setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }
    public String getCorreo() { return correo; }
    public void setCorreo(String correo) { this.correo = correo; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public List<String> getPermisos() { return permisos; }
    public void setPermisos(List<String> permisos) { this.permisos = permisos; }
}
