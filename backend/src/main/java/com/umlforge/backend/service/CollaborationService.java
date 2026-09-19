package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlEventMessage;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class CollaborationService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final DiagramaRepository diagramaRepository;
    private final UsuarioRepository usuarioRepository;

    // diagramaId -> (usuarioId -> sessionIds)
    private final Map<Long, Map<Long, Set<String>>> activeSessions = new ConcurrentHashMap<>();

    // diagramaId -> (usuarioId -> UsuarioInfo)
    private final Map<Long, Map<Long, PresenceInfo>> presenceMap = new ConcurrentHashMap<>();
    
    // diagramaId -> (elementoId -> usuarioId)
    private final Map<Long, Map<String, Long>> locksMap = new ConcurrentHashMap<>();

    // sessionId -> (diagramaId, usuarioId)
    private final Map<String, SessionInfo> sessionMap = new ConcurrentHashMap<>();

    // diagramaId -> list of history events
    private final Map<Long, Deque<UmlEventMessage>> historyMap = new ConcurrentHashMap<>();

    public CollaborationService(SimpMessageSendingOperations messagingTemplate, DiagramaRepository diagramaRepository, UsuarioRepository usuarioRepository) {
        this.messagingTemplate = messagingTemplate;
        this.diagramaRepository = diagramaRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public synchronized void userJoined(String sessionId, Long diagramaId, String email) {
        if (sessionId == null || diagramaId == null || email == null) return;

        Usuario user = usuarioRepository.findByCorreo(email).orElse(null);
        if (user == null) return;

        Long userId = user.getId();
        SessionInfo previousSession = sessionMap.get(sessionId);
        if (previousSession != null
                && (!Objects.equals(previousSession.diagramaId, diagramaId)
                || !Objects.equals(previousSession.usuarioId, userId))) {
            userLeft(sessionId);
        }

        Map<Long, Set<String>> diagramSessions = activeSessions.computeIfAbsent(
            diagramaId,
            ignored -> new ConcurrentHashMap<>()
        );
        Set<String> userSessions = diagramSessions.computeIfAbsent(
            userId,
            ignored -> ConcurrentHashMap.newKeySet()
        );
        boolean firstSession = userSessions.isEmpty();
        userSessions.add(sessionId);
        sessionMap.put(sessionId, new SessionInfo(diagramaId, userId));

        String nombreCompleto = getNombreCompleto(user);
        String rol = user.getRol() != null ? user.getRol().getNombre() : "";
        presenceMap
            .computeIfAbsent(diagramaId, ignored -> new ConcurrentHashMap<>())
            .put(userId, new PresenceInfo(userId.toString(), nombreCompleto, rol));

        if (firstSession) {
            UmlEventMessage joinEvent = createUserEvent("USER_JOINED", diagramaId, userId, nombreCompleto);
            messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, joinEvent);
            addToHistory(diagramaId, joinEvent);
        }

        broadcastPresence(diagramaId);
    }

    public synchronized void userLeft(String sessionId) {
        SessionInfo info = sessionMap.remove(sessionId);
        if (info == null) return;

        Long diagramaId = info.diagramaId;
        Long userId = info.usuarioId;
        Map<Long, Set<String>> diagramSessions = activeSessions.get(diagramaId);
        Set<String> userSessions = diagramSessions != null ? diagramSessions.get(userId) : null;

        if (userSessions != null) {
            userSessions.remove(sessionId);
            if (!userSessions.isEmpty()) return;

            diagramSessions.remove(userId);
            if (diagramSessions.isEmpty()) activeSessions.remove(diagramaId);
        }

        PresenceInfo removedUser = null;
        Map<Long, PresenceInfo> diagramPresence = presenceMap.get(diagramaId);
        if (diagramPresence != null) {
            removedUser = diagramPresence.remove(userId);
            if (diagramPresence.isEmpty()) presenceMap.remove(diagramaId);
        }

        if (removedUser != null) {
            UmlEventMessage leaveEvent = createUserEvent(
                "USER_LEFT",
                diagramaId,
                userId,
                removedUser.getNombre()
            );
            messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, leaveEvent);
            addToHistory(diagramaId, leaveEvent);
        }

        releaseUserLocks(diagramaId, userId);
        broadcastPresence(diagramaId);
    }

    public boolean lockElement(Long diagramaId, String elementoId, Long userId) {
        locksMap.putIfAbsent(diagramaId, new ConcurrentHashMap<>());
        Map<String, Long> locks = locksMap.get(diagramaId);
        
        Long lockedBy = locks.putIfAbsent(elementoId, userId);
        return lockedBy == null || lockedBy.equals(userId);
    }

    public void unlockElement(Long diagramaId, String elementoId, Long userId) {
        if (locksMap.containsKey(diagramaId)) {
            locksMap.get(diagramaId).remove(elementoId, userId);
        }
    }

    public void addToHistory(Long diagramaId, UmlEventMessage event) {
        historyMap.putIfAbsent(diagramaId, new ConcurrentLinkedDeque<>());
        Deque<UmlEventMessage> queue = historyMap.get(diagramaId);
        queue.addFirst(event);
        if (queue.size() > 100) queue.removeLast();
        UmlEventMessage histEvent = new UmlEventMessage();
        histEvent.setTipoEvento("HISTORY_UPDATE");
        histEvent.setDiagramaId(diagramaId);
        histEvent.setPayload(List.copyOf(queue));
        messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, histEvent);
    }

    public void broadcastPresence(Long diagramaId) {
        List<PresenceInfo> snapshot = new ArrayList<>(
            presenceMap.getOrDefault(diagramaId, Collections.emptyMap()).values()
        );
        snapshot.sort(Comparator.comparing(PresenceInfo::getNombre, String.CASE_INSENSITIVE_ORDER));

        UmlEventMessage msg = new UmlEventMessage();
        msg.setTipoEvento("PRESENCE_UPDATE");
        msg.setDiagramaId(diagramaId);
        msg.setPayload(snapshot);
        messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, msg);
    }

    public void requestPresence(Long diagramaId) {
        broadcastPresence(diagramaId);
    }

    private void releaseUserLocks(Long diagramaId, Long userId) {
        Map<String, Long> locks = locksMap.get(diagramaId);
        if (locks == null) return;

        for (Map.Entry<String, Long> entry : locks.entrySet()) {
            if (entry.getValue().equals(userId) && locks.remove(entry.getKey(), userId)) {
                UmlEventMessage unlockMsg = new UmlEventMessage();
                unlockMsg.setTipoEvento("UNLOCK_ELEMENT");
                unlockMsg.setDiagramaId(diagramaId);
                unlockMsg.setUsuarioId(userId);
                unlockMsg.setElementoId(entry.getKey());
                messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, unlockMsg);
            }
        }

        if (locks.isEmpty()) locksMap.remove(diagramaId);
    }

    private UmlEventMessage createUserEvent(String tipoEvento, Long diagramaId, Long userId, String nombre) {
        UmlEventMessage event = new UmlEventMessage();
        event.setTipoEvento(tipoEvento);
        event.setDiagramaId(diagramaId);
        event.setUsuarioId(userId);
        event.setUsuarioNombre(nombre);
        return event;
    }

    private String getNombreCompleto(Usuario user) {
        String nombre = user.getNombre() == null ? "" : user.getNombre().trim();
        String apellido = user.getApellido() == null ? "" : user.getApellido().trim();
        String nombreCompleto = (nombre + " " + apellido).trim();
        return nombreCompleto.isEmpty() ? user.getCorreo() : nombreCompleto;
    }

    private static class SessionInfo {
        private final Long diagramaId;
        private final Long usuarioId;

        public SessionInfo(Long diagramaId, Long usuarioId) {
            this.diagramaId = diagramaId;
            this.usuarioId = usuarioId;
        }
    }

    private static class PresenceInfo {
        private final String id;
        private final String nombre;
        private final String rol;

        public PresenceInfo(String id, String nombre, String rol) {
            this.id = id;
            this.nombre = nombre;
            this.rol = rol;
        }

        public String getId() { return id; }
        public String getNombre() { return nombre; }
        public String getRol() { return rol; }
    }
}




