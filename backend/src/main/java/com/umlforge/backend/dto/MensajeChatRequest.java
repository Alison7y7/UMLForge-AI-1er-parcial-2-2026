package com.umlforge.backend.dto;

import tools.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MensajeChatRequest {

    @NotBlank(message = "El contenido es obligatorio")
    @Size(max = 10000, message = "El contenido no puede superar 10000 caracteres")
    private String contenido;

    private JsonNode metadatos;

    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public JsonNode getMetadatos() { return metadatos; }
    public void setMetadatos(JsonNode metadatos) { this.metadatos = metadatos; }
}
