package com.umlforge.backend.service;

import com.umlforge.backend.dto.SolicitudIAChatRequest;
import com.umlforge.backend.dto.SolicitudIAChatResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ChatIAProyectoService {
    private final ProjectChatExecutionCoordinator coordinator;
    private final ChatIAProyectoTransactionalService transactionalService;
    private final ProjectAccessService accessService;
    private final ChatIAActivityService activityService;

    public SolicitudIAChatResponse solicitar(Long proyectoId, SolicitudIAChatRequest request, String correo) {
        var usuario = accessService.requireUser(correo);
        accessService.requireProjectAccess(proyectoId, usuario);
        return coordinator.execute(proyectoId, () -> {
            activityService.iniciar(proyectoId, request.solicitudId(), usuario);
            try {
                return transactionalService.procesar(proyectoId, request, correo);
            } finally {
                activityService.finalizar(proyectoId, request.solicitudId(), usuario);
            }
        });
    }
}
