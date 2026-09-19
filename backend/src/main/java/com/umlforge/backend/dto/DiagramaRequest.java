package com.umlforge.backend.dto;

public class DiagramaRequest {
    private String nombre;
    private String modeloJson;

    // Getters and setters
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getModeloJson() { return modeloJson; }
    public void setModeloJson(String modeloJson) { this.modeloJson = modeloJson; }
}
