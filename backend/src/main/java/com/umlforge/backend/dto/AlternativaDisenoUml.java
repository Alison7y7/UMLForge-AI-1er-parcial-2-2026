package com.umlforge.backend.dto;

import java.util.List;

public record AlternativaDisenoUml(
        String id,
        String nombre,
        String descripcion,
        List<String> ventajas,
        List<String> limitaciones,
        String requisitosFaltantes,
        boolean recomendada,
        List<RecomendacionUml> recomendaciones) {
}
