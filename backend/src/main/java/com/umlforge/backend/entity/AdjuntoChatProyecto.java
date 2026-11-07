package com.umlforge.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(name = "adjunto_chat_proyecto", indexes = {
        @Index(name = "idx_adjunto_chat_mensaje", columnList = "mensaje_id"),
        @Index(name = "idx_adjunto_chat_proyecto", columnList = "proyecto_id")
})
public class AdjuntoChatProyecto {

    @Id
    @Column(length = 36, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false, updatable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mensaje_id", nullable = false, updatable = false)
    private MensajeChatProyecto mensaje;

    @Column(name = "nombre_original", nullable = false, length = 255, updatable = false)
    private String nombreOriginal;

    @Column(name = "storage_key", nullable = false, unique = true, length = 255, updatable = false)
    private String storageKey;

    @Column(name = "mime_type", nullable = false, length = 120, updatable = false)
    private String mimeType;

    @Column(name = "tamano_bytes", nullable = false, updatable = false)
    private Long tamanoBytes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16, updatable = false)
    private CategoriaAdjuntoChat categoria;

    @Column(name = "sha256", nullable = false, length = 64, updatable = false)
    private String sha256;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @PrePersist
    protected void onCreate() {
        if (id == null) id = UUID.randomUUID().toString();
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now(ZoneOffset.UTC);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Proyecto getProyecto() { return proyecto; }
    public void setProyecto(Proyecto proyecto) { this.proyecto = proyecto; }
    public MensajeChatProyecto getMensaje() { return mensaje; }
    public void setMensaje(MensajeChatProyecto mensaje) { this.mensaje = mensaje; }
    public String getNombreOriginal() { return nombreOriginal; }
    public void setNombreOriginal(String nombreOriginal) { this.nombreOriginal = nombreOriginal; }
    public String getStorageKey() { return storageKey; }
    public void setStorageKey(String storageKey) { this.storageKey = storageKey; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public Long getTamanoBytes() { return tamanoBytes; }
    public void setTamanoBytes(Long tamanoBytes) { this.tamanoBytes = tamanoBytes; }
    public CategoriaAdjuntoChat getCategoria() { return categoria; }
    public void setCategoria(CategoriaAdjuntoChat categoria) { this.categoria = categoria; }
    public String getSha256() { return sha256; }
    public void setSha256(String sha256) { this.sha256 = sha256; }
    public LocalDateTime getFechaCreacion() { return fechaCreacion; }
    public void setFechaCreacion(LocalDateTime fechaCreacion) { this.fechaCreacion = fechaCreacion; }
}
