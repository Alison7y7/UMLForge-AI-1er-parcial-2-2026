package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "mensaje_chat_proyecto", indexes = {
        @Index(name = "idx_mensaje_chat_proyecto_fecha", columnList = "proyecto_id,fecha_hora,id"),
        @Index(name = "idx_mensaje_chat_correlacion", columnList = "correlacion_id")
})
public class MensajeChatProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false, updatable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_emisor_id", updatable = false)
    private Usuario usuarioEmisor;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_emisor", nullable = false, length = 16, updatable = false)
    private TipoEmisorChat tipoEmisor;

    @Column(nullable = false, columnDefinition = "TEXT", updatable = false)
    private String contenido;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private EstadoMensajeChat estado;

    @Column(name = "correlacion_id", nullable = false, length = 36, updatable = false)
    private String correlacionId;

    @Column(columnDefinition = "TEXT")
    private String metadatos;

    @OneToMany(mappedBy = "mensaje", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fechaCreacion ASC")
    private List<AdjuntoChatProyecto> adjuntos = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        if (tipoEmisor == TipoEmisorChat.USUARIO && usuarioEmisor == null) {
            throw new IllegalStateException("Un mensaje de usuario requiere un emisor autenticado");
        }
        if (fechaHora == null) fechaHora = LocalDateTime.now(ZoneOffset.UTC);
        if (correlacionId == null) correlacionId = UUID.randomUUID().toString();
        if (estado == null) estado = EstadoMensajeChat.ENVIADO;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Proyecto getProyecto() { return proyecto; }
    public void setProyecto(Proyecto proyecto) { this.proyecto = proyecto; }
    public Usuario getUsuarioEmisor() { return usuarioEmisor; }
    public void setUsuarioEmisor(Usuario usuarioEmisor) { this.usuarioEmisor = usuarioEmisor; }
    public TipoEmisorChat getTipoEmisor() { return tipoEmisor; }
    public void setTipoEmisor(TipoEmisorChat tipoEmisor) { this.tipoEmisor = tipoEmisor; }
    public String getContenido() { return contenido; }
    public void setContenido(String contenido) { this.contenido = contenido; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public EstadoMensajeChat getEstado() { return estado; }
    public void setEstado(EstadoMensajeChat estado) { this.estado = estado; }
    public String getCorrelacionId() { return correlacionId; }
    public void setCorrelacionId(String correlacionId) { this.correlacionId = correlacionId; }
    public String getMetadatos() { return metadatos; }
    public void setMetadatos(String metadatos) { this.metadatos = metadatos; }
    public List<AdjuntoChatProyecto> getAdjuntos() { return adjuntos; }
    public void setAdjuntos(List<AdjuntoChatProyecto> adjuntos) { this.adjuntos = adjuntos; }
    public void addAdjunto(AdjuntoChatProyecto adjunto) {
        adjuntos.add(adjunto);
        adjunto.setMensaje(this);
    }
}
