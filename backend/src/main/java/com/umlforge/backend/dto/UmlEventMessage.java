package com.umlforge.backend.dto;

public class UmlEventMessage {
    private String tipoEvento;
    private Long diagramaId;
    private Long usuarioId;
    private String usuarioNombre;
    private String elementoId;
    private Object payload;
    private Long timestamp;

    // Getters and setters
    public String getTipoEvento() { return tipoEvento; }
    public void setTipoEvento(String tipoEvento) { this.tipoEvento = tipoEvento; }
    public Long getDiagramaId() { return diagramaId; }
    public void setDiagramaId(Long diagramaId) { this.diagramaId = diagramaId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    public String getElementoId() { return elementoId; }
    public void setElementoId(String elementoId) { this.elementoId = elementoId; }
    public Object getPayload() { return payload; }
    public void setPayload(Object payload) { this.payload = payload; }
    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }
}
