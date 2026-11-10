package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "push_subscription", uniqueConstraints = @UniqueConstraint(columnNames = "endpoint"))
public class PushSubscription {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
    @Column(nullable = false, length = 2048)
    private String endpoint;
    @Column(nullable = false, length = 256)
    private String p256dh;
    @Column(nullable = false, length = 128)
    private String auth;
    @Column(length = 120)
    private String dispositivo;
    @Column(nullable = false)
    private boolean activa = true;
    @Column(nullable = false)
    private Instant fechaCreacion;
    @Column(nullable = false)
    private Instant fechaActualizacion;
    private Instant ultimoExito;
    private Integer fallosConsecutivos = 0;

    @PrePersist void prePersist() { fechaCreacion = fechaActualizacion = Instant.now(); }
    @PreUpdate void preUpdate() { fechaActualizacion = Instant.now(); }
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public String getDispositivo() { return dispositivo; }
    public void setDispositivo(String dispositivo) { this.dispositivo = dispositivo; }
    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }
    public Instant getUltimoExito() { return ultimoExito; }
    public void setUltimoExito(Instant ultimoExito) { this.ultimoExito = ultimoExito; }
    public Integer getFallosConsecutivos() { return fallosConsecutivos; }
    public void setFallosConsecutivos(Integer fallosConsecutivos) { this.fallosConsecutivos = fallosConsecutivos; }
}
