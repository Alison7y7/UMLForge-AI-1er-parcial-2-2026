package com.umlforge.backend.service;

import com.umlforge.backend.dto.UmlEventMessage;
import com.umlforge.backend.entity.Diagrama;
import com.umlforge.backend.entity.Usuario;
import com.umlforge.backend.repository.DiagramaRepository;
import com.umlforge.backend.repository.UsuarioRepository;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
public class CollaborationService {

    private final SimpMessageSendingOperations messagingTemplate;
    private final DiagramaRepository diagramaRepository;
    private final UsuarioRepository usuarioRepository;

    // diagramaId -> (usuarioId -> UsuarioInfo)
    private final Map<Long, Map<Long, Map<String, String>>> presenceMap = new ConcurrentHashMap<>();
    
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

    public void userJoined(String sessionId, Long diagramaId, String email) {
        Usuario user = usuarioRepository.findByCorreo(email).orElse(null);
        if (user == null) return;
        
        Long userId = user.getId();
        sessionMap.put(sessionId, new SessionInfo(diagramaId, userId));
        
        presenceMap.putIfAbsent(diagramaId, new ConcurrentHashMap<>());
        Map<String, String> userInfo = new HashMap<>();
        userInfo.put("id", userId.toString());
        userInfo.put("nombre", user.getNombre());
        userInfo.put("rol", user.getRol().getNombre());
        presenceMap.get(diagramaId).put(userId, userInfo);
        
        broadcastPresence(diagramaId);
        UmlEventMessage joinEvent = new UmlEventMessage();
        joinEvent.setTipoEvento("USER_JOINED");
        joinEvent.setDiagramaId(diagramaId);
        joinEvent.setUsuarioId(userId);
        joinEvent.setUsuarioNombre(user.getNombre());
        addToHistory(diagramaId, joinEvent);
    }

    public void userLeft(String sessionId) {
        SessionInfo info = sessionMap.remove(sessionId);
        if (info != null) {
            Long diagramaId = info.diagramaId;
            Long userId = info.usuarioId;
            
            if (presenceMap.containsKey(diagramaId)) {
                presenceMap.get(diagramaId).remove(userId);
                broadcastPresence(diagramaId);
                UmlEventMessage leaveEvent = new UmlEventMessage();
                leaveEvent.setTipoEvento("USER_LEFT");
                leaveEvent.setDiagramaId(diagramaId);
                leaveEvent.setUsuarioId(userId);
                leaveEvent.setUsuarioNombre("Un usuario");
                addToHistory(diagramaId, leaveEvent);
            }
            
            if (locksMap.containsKey(diagramaId)) {
                boolean unlocked = false;
                Map<String, Long> locks = locksMap.get(diagramaId);
                Iterator<Map.Entry<String, Long>> it = locks.entrySet().iterator();
                while (it.hasNext()) {
                    Map.Entry<String, Long> entry = it.next();
                    if (entry.getValue().equals(userId)) {
                        it.remove();
                        unlocked = true;
                        
                        UmlEventMessage unlockMsg = new UmlEventMessage();
                        unlockMsg.setTipoEvento("UNLOCK_ELEMENT");
                        unlockMsg.setDiagramaId(diagramaId);
                        unlockMsg.setUsuarioId(userId);
                        unlockMsg.setElementoId(entry.getKey());
                        messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, unlockMsg);
                    }
                }
            }
        }
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
        histEvent.setPayload(queue);
        messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, histEvent);
    }

    public void broadcastPresence(Long diagramaId) {
        UmlEventMessage msg = new UmlEventMessage();
        msg.setTipoEvento("PRESENCE_UPDATE");
        msg.setDiagramaId(diagramaId);
        msg.setPayload(presenceMap.getOrDefault(diagramaId, new HashMap<>()).values());
        messagingTemplate.convertAndSend("/topic/diagramas/" + diagramaId, msg);
    }

    private static class SessionInfo {
        Long diagramaId;
        Long usuarioId;
        public SessionInfo(Long diagramaId, Long usuarioId) {
            this.diagramaId = diagramaId;
            this.usuarioId = usuarioId;
        }
    }
}




