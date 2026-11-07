package com.umlforge.backend.service;

import com.umlforge.backend.dto.ActividadIAChatResponse;
import com.umlforge.backend.entity.Usuario;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ChatIAActivityService {
    private final SimpMessageSendingOperations messagingTemplate;
    private final Map<Long, Map<String, ActividadIAChatResponse>> activeByProject = new ConcurrentHashMap<>();

    public void iniciar(Long projectId, String solicitudId, Usuario usuario) {
        ActividadIAChatResponse activity = new ActividadIAChatResponse(
                solicitudId, usuario.getId(), nombreCompleto(usuario), "INICIO", Instant.now());
        activeByProject.computeIfAbsent(projectId, ignored -> new ConcurrentHashMap<>())
                .put(solicitudId, activity);
        publish(projectId, activity);
    }

    public void finalizar(Long projectId, String solicitudId, Usuario usuario) {
        Map<String, ActividadIAChatResponse> project = activeByProject.get(projectId);
        if (project != null) {
            project.remove(solicitudId);
            if (project.isEmpty()) activeByProject.remove(projectId, project);
        }
        publish(projectId, new ActividadIAChatResponse(
                solicitudId, usuario.getId(), nombreCompleto(usuario), "FIN", Instant.now()));
    }

    public List<ActividadIAChatResponse> snapshot(Long projectId) {
        return List.copyOf(activeByProject.getOrDefault(projectId, Map.of()).values());
    }

    private void publish(Long projectId, ActividadIAChatResponse activity) {
        messagingTemplate.convertAndSend(
                "/topic/proyectos/" + projectId + "/chat/estado-ia", activity);
    }

    private String nombreCompleto(Usuario usuario) {
        String nombre = usuario.getNombre() == null ? "" : usuario.getNombre().trim();
        String apellido = usuario.getApellido() == null ? "" : usuario.getApellido().trim();
        String completo = (nombre + " " + apellido).trim();
        return completo.isBlank() ? usuario.getCorreo() : completo;
    }
}
