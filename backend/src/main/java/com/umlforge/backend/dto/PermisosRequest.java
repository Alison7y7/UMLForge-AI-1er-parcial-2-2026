package com.umlforge.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class PermisosRequest {
    private List<String> permisos;
}