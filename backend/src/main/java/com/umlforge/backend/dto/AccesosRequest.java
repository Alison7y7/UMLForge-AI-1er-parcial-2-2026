package com.umlforge.backend.dto;

import java.util.List;

public class AccesosRequest {
    private Long rolId;
    private List<String> permisos;

    // Getters and setters
    public Long getRolId() { return rolId; }
    public void setRolId(Long rolId) { this.rolId = rolId; }
    public List<String> getPermisos() { return permisos; }
    public void setPermisos(List<String> permisos) { this.permisos = permisos; }
}
