package com.umlforge.backend.service.ia.chat;

import com.umlforge.backend.dto.RecomendacionUml;
import java.util.List;

public record ChatIAParsedResponse(String respuesta, List<RecomendacionUml> recomendaciones,
                                   int recomendacionesDescartadas) {
}
