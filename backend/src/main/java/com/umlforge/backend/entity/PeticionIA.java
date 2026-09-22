package com.umlforge.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "peticion_ia")
public class PeticionIA {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "diagrama_id")
    private Diagrama diagrama;

    @Column(name = "prompt_texto", columnDefinition = "TEXT")
    private String promptTexto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrigenPeticion origen;

    @Column(name = "resultado_json", columnDefinition = "TEXT")
    private String resultadoJson;

    @Column(name = "tokens_usados")
    private Integer tokensUsados;

    private Boolean exitoso;

    @Column(name = "fecha_peticion", nullable = false)
    private LocalDateTime fechaPeticion;

    @PrePersist
    protected void onCreate() {
        fechaPeticion = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Diagrama getDiagrama() { return diagrama; }
    public void setDiagrama(Diagrama diagrama) { this.diagrama = diagrama; }
    public String getPromptTexto() { return promptTexto; }
    public void setPromptTexto(String promptTexto) { this.promptTexto = promptTexto; }
    public OrigenPeticion getOrigen() { return origen; }
    public void setOrigen(OrigenPeticion origen) { this. origen = origen; }
    public String getResultadoJson() { return resultadoJson; }
    public void setResultadoJson(String resultadoJson) { this.resultadoJson = resultadoJson; }
    public Integer getTokensUsados() { return tokensUsados; }
    public void setTokensUsados(Integer tokensUsados) { this.tokensUsados = tokensUsados; }
    public Boolean getExitoso() { return exitoso; }
    public void setExitoso(Boolean exitoso) { this.exitoso = exitoso; }
    public LocalDateTime getFechaPeticion() { return fechaPeticion; }
    public void setFechaPeticion(LocalDateTime fechaPeticion) { this.fechaPeticion = fechaPeticion; }
}
