package com.umlforge.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String nombre;
    private String apellido;
    private String correo;
    private String rol;
    private java.util.List<String> permisos;
}
