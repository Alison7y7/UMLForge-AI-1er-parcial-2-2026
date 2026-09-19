package com.umlforge.backend.service;

import com.umlforge.backend.dto.BitacoraResponse;
import com.umlforge.backend.entity.Bitacora;
import com.umlforge.backend.entity.Proyecto;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.BitacoraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BitacoraService {
    private final BitacoraRepository bitacoraRepository;

    public void registrarAccion(Usuario usuario, Proyecto proyecto, String accion, String descripcion) {
        Bitacora bitacora = new Bitacora();
        bitacora.setUsuario(usuario);
        bitacora.setProyecto(proyecto);
        bitacora.setAccion(accion);
        bitacora.setDescripcion(descripcion);
        bitacora.setFechaHora(LocalDateTime.now());
        bitacoraRepository.save(bitacora);
    }

    public List<BitacoraResponse> listarTodaLaBitacora() {
        return bitacoraRepository.findAllByOrderByFechaHoraDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<BitacoraResponse> listarBitacoraPorAnfitrion(Long anfitrionId) {
        return bitacoraRepository.findByProyectoAnfitrionIdOrderByFechaHoraDesc(anfitrionId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private BitacoraResponse mapToResponse(Bitacora b) {
        BitacoraResponse response = new BitacoraResponse();
        response.setId(b.getId());
        response.setAccion(b.getAccion());
        response.setDescripcion(b.getDescripcion());
        response.setFechaHora(b.getFechaHora());
        response.setUsuarioNombre(b.getUsuario() != null ? b.getUsuario().getNombre() + " " + b.getUsuario().getApellido() : null);
        response.setProyectoNombre(b.getProyecto() != null ? b.getProyecto().getNombre() : null);
        return response;
    }
}
