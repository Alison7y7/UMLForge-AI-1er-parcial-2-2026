package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "solicitud_ia_chat_proyecto", uniqueConstraints = {
        @UniqueConstraint(name = "uk_solicitud_ia_chat_proyecto_id", columnNames = {"proyecto_id", "solicitud_id"})
}, indexes = {
        @Index(name = "idx_solicitud_ia_chat_proyecto_fecha", columnList = "proyecto_id,fecha_solicitud")
})
public class SolicitudIAChatProyecto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "solicitud_id", nullable = false, updatable = false, length = 36)
    private String solicitudId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false, updatable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "diagrama_id", nullable = false, updatable = false)
    private Diagrama diagrama;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mensaje_usuario_id", nullable = false, updatable = false)
    private MensajeChatProyecto mensajeUsuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "solicitante_id", nullable = false, updatable = false)
    private Usuario solicitante;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mensaje_respuesta_id")
    private MensajeChatProyecto mensajeRespuesta;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private EstadoSolicitudIAChat estado;

    @Column(length = 64)
    private String proveedor;

    @Column(name = "detalle_error", columnDefinition = "TEXT")
    private String detalleError;

    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "fecha_finalizacion")
    private LocalDateTime fechaFinalizacion;

    @PrePersist
    void onCreate() {
        if (fechaSolicitud == null) fechaSolicitud = LocalDateTime.now();
        if (estado == null) estado = EstadoSolicitudIAChat.PROCESANDO;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getSolicitudId() { return solicitudId; }
    public void setSolicitudId(String solicitudId) { this.solicitudId = solicitudId; }
    public Proyecto getProyecto() { return proyecto; }
    public void setProyecto(Proyecto proyecto) { this.proyecto = proyecto; }
    public Diagrama getDiagrama() { return diagrama; }
    public void setDiagrama(Diagrama diagrama) { this.diagrama = diagrama; }
    public MensajeChatProyecto getMensajeUsuario() { return mensajeUsuario; }
    public void setMensajeUsuario(MensajeChatProyecto mensajeUsuario) { this.mensajeUsuario = mensajeUsuario; }
    public Usuario getSolicitante() { return solicitante; }
    public void setSolicitante(Usuario solicitante) { this.solicitante = solicitante; }
    public MensajeChatProyecto getMensajeRespuesta() { return mensajeRespuesta; }
    public void setMensajeRespuesta(MensajeChatProyecto mensajeRespuesta) { this.mensajeRespuesta = mensajeRespuesta; }
    public EstadoSolicitudIAChat getEstado() { return estado; }
    public void setEstado(EstadoSolicitudIAChat estado) { this.estado = estado; }
    public String getProveedor() { return proveedor; }
    public void setProveedor(String proveedor) { this.proveedor = proveedor; }
    public String getDetalleError() { return detalleError; }
    public void setDetalleError(String detalleError) { this.detalleError = detalleError; }
    public LocalDateTime getFechaSolicitud() { return fechaSolicitud; }
    public void setFechaSolicitud(LocalDateTime fechaSolicitud) { this.fechaSolicitud = fechaSolicitud; }
    public LocalDateTime getFechaFinalizacion() { return fechaFinalizacion; }
    public void setFechaFinalizacion(LocalDateTime fechaFinalizacion) { this.fechaFinalizacion = fechaFinalizacion; }
}
