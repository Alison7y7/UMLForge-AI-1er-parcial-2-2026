package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "recomendacion_aplicada_proyecto", uniqueConstraints = {
        @UniqueConstraint(name = "uk_recomendacion_aplicada_mensaje", columnNames = {"mensaje_ia_id", "recomendacion_id"})
}, indexes = {
        @Index(name = "idx_recomendacion_aplicada_diagrama", columnList = "diagrama_id,fecha_aplicacion")
})
public class RecomendacionAplicadaProyecto {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recomendacion_id", nullable = false, updatable = false, length = 36)
    private String recomendacionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mensaje_ia_id", nullable = false, updatable = false)
    private MensajeChatProyecto mensajeIa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proyecto_id", nullable = false, updatable = false)
    private Proyecto proyecto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "diagrama_id", nullable = false, updatable = false)
    private Diagrama diagrama;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "aplicada_por_id", nullable = false, updatable = false)
    private Usuario aplicadaPor;

    @Column(name = "tipo_cambio", nullable = false, updatable = false, length = 40)
    private String tipoCambio;

    @Column(name = "version_origen", nullable = false, updatable = false)
    private Long versionOrigen;

    @Column(name = "version_resultado", nullable = false, updatable = false)
    private Long versionResultado;

    @Column(name = "fecha_aplicacion", nullable = false, updatable = false)
    private LocalDateTime fechaAplicacion;

    @PrePersist
    void onCreate() {
        if (fechaAplicacion == null) fechaAplicacion = LocalDateTime.now(ZoneOffset.UTC);
    }

    public Long getId() { return id; }
    public String getRecomendacionId() { return recomendacionId; }
    public void setRecomendacionId(String recomendacionId) { this.recomendacionId = recomendacionId; }
    public MensajeChatProyecto getMensajeIa() { return mensajeIa; }
    public void setMensajeIa(MensajeChatProyecto mensajeIa) { this.mensajeIa = mensajeIa; }
    public Proyecto getProyecto() { return proyecto; }
    public void setProyecto(Proyecto proyecto) { this.proyecto = proyecto; }
    public Diagrama getDiagrama() { return diagrama; }
    public void setDiagrama(Diagrama diagrama) { this.diagrama = diagrama; }
    public Usuario getAplicadaPor() { return aplicadaPor; }
    public void setAplicadaPor(Usuario aplicadaPor) { this.aplicadaPor = aplicadaPor; }
    public String getTipoCambio() { return tipoCambio; }
    public void setTipoCambio(String tipoCambio) { this.tipoCambio = tipoCambio; }
    public Long getVersionOrigen() { return versionOrigen; }
    public void setVersionOrigen(Long versionOrigen) { this.versionOrigen = versionOrigen; }
    public Long getVersionResultado() { return versionResultado; }
    public void setVersionResultado(Long versionResultado) { this.versionResultado = versionResultado; }
    public LocalDateTime getFechaAplicacion() { return fechaAplicacion; }
}
