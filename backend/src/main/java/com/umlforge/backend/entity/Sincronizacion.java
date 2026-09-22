package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "sincronizacion")
public class Sincronizacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diagrama_id", nullable = false)
    private Diagrama diagrama;

    @Column(name = "version_cliente")
    private Long versionCliente;

    @Column(name = "version_servidor")
    private Long versionServidor;

    @Column(name = "modelo_json_cliente", columnDefinition = "TEXT", nullable = false)
    private String modeloJsonCliente;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_resolucion", nullable = false)
    private EstadoSincronizacion estadoResolucion;

    @Column(name = "fecha_colision", nullable = false)
    private LocalDateTime fechaColision;

    @PrePersist
    protected void onCreate() {
        fechaColision = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Diagrama getDiagrama() { return diagrama; }
    public void setDiagrama(Diagrama diagrama) { this.diagrama = diagrama; }
    public Long getVersionCliente() { return versionCliente; }
    public void setVersionCliente(Long versionCliente) { this.versionCliente = versionCliente; }
    public Long getVersionServidor() { return versionServidor; }
    public void setVersionServidor(Long versionServidor) { this.versionServidor = versionServidor; }
    public String getModeloJsonCliente() { return modeloJsonCliente; }
    public void setModeloJsonCliente(String modeloJsonCliente) { this.modeloJsonCliente = modeloJsonCliente; }
    public EstadoSincronizacion getEstadoResolucion() { return estadoResolucion; }
    public void setEstadoResolucion(EstadoSincronizacion estadoResolucion) { this.estadoResolucion = estadoResolucion; }
    public LocalDateTime getFechaColision() { return fechaColision; }
    public void setFechaColision(LocalDateTime fechaColision) { this.fechaColision = fechaColision; }
}
