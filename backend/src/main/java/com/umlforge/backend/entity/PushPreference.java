package com.umlforge.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "push_preference", uniqueConstraints = @UniqueConstraint(columnNames = "usuario_id"))
public class PushPreference {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
    @Column(nullable = false) private boolean invitaciones = true;
    @Column(nullable = false) private boolean menciones = true;
    @Column(nullable = false) private boolean recomendaciones = true;
    @Column(nullable = false) private boolean cambiosUml = false;
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public boolean isInvitaciones() { return invitaciones; }
    public void setInvitaciones(boolean value) { invitaciones = value; }
    public boolean isMenciones() { return menciones; }
    public void setMenciones(boolean value) { menciones = value; }
    public boolean isRecomendaciones() { return recomendaciones; }
    public void setRecomendaciones(boolean value) { recomendaciones = value; }
    public boolean isCambiosUml() { return cambiosUml; }
    public void setCambiosUml(boolean value) { cambiosUml = value; }
}
