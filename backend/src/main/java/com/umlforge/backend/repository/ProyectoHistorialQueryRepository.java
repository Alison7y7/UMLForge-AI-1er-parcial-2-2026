package com.umlforge.backend.repository;

import com.umlforge.backend.entity.Bitacora;
import com.umlforge.backend.entity.MensajeChatProyecto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.*;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Repository
public class ProyectoHistorialQueryRepository {
    @PersistenceContext
    private EntityManager entityManager;

    public List<MensajeChatProyecto> searchMessages(Long projectId, LocalDateTime before,
            LocalDateTime from, LocalDateTime to, Long participantId, String search, int limit) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> idQuery = cb.createQuery(Long.class);
        Root<MensajeChatProyecto> root = idQuery.from(MensajeChatProyecto.class);
        List<Predicate> predicates = commonPredicates(cb, root, projectId, before, from, to, participantId);
        if (search != null && !search.isBlank()) {
            predicates.add(cb.like(cb.lower(root.get("contenido")), pattern(search)));
        }
        idQuery.select(root.get("id")).where(predicates.toArray(Predicate[]::new))
                .orderBy(cb.desc(root.get("fechaHora")), cb.desc(root.get("id")));
        List<Long> ids = entityManager.createQuery(idQuery).setMaxResults(limit).getResultList();
        if (ids.isEmpty()) return List.of();

        CriteriaQuery<MensajeChatProyecto> dataQuery = cb.createQuery(MensajeChatProyecto.class);
        Root<MensajeChatProyecto> message = dataQuery.from(MensajeChatProyecto.class);
        message.fetch("usuarioEmisor", JoinType.LEFT);
        message.fetch("adjuntos", JoinType.LEFT);
        dataQuery.select(message).distinct(true).where(
                cb.equal(message.get("proyecto").get("id"), projectId), message.get("id").in(ids));
        return entityManager.createQuery(dataQuery).getResultList();
    }

    public List<Bitacora> searchActivities(Long projectId, LocalDateTime before,
            LocalDateTime from, LocalDateTime to, Long participantId, String search, int limit) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Long> idQuery = cb.createQuery(Long.class);
        Root<Bitacora> root = idQuery.from(Bitacora.class);
        List<Predicate> predicates = commonPredicates(cb, root, projectId, before, from, to, participantId);
        if (search != null && !search.isBlank()) {
            Expression<String> action = cb.coalesce(root.get("accion"), "");
            Expression<String> description = cb.coalesce(root.get("descripcion"), "");
            predicates.add(cb.like(cb.lower(cb.concat(cb.concat(action, " "), description)), pattern(search)));
        }
        idQuery.select(root.get("id")).where(predicates.toArray(Predicate[]::new))
                .orderBy(cb.desc(root.get("fechaHora")), cb.desc(root.get("id")));
        List<Long> ids = entityManager.createQuery(idQuery).setMaxResults(limit).getResultList();
        if (ids.isEmpty()) return List.of();

        CriteriaQuery<Bitacora> dataQuery = cb.createQuery(Bitacora.class);
        Root<Bitacora> activity = dataQuery.from(Bitacora.class);
        activity.fetch("usuario", JoinType.LEFT);
        activity.fetch("proyecto", JoinType.LEFT);
        dataQuery.select(activity).distinct(true).where(
                cb.equal(activity.get("proyecto").get("id"), projectId), activity.get("id").in(ids));
        return entityManager.createQuery(dataQuery).getResultList();
    }

    private <T> List<Predicate> commonPredicates(CriteriaBuilder cb, Root<T> root, Long projectId,
            LocalDateTime before, LocalDateTime from, LocalDateTime to, Long participantId) {
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(cb.equal(root.get("proyecto").get("id"), projectId));
        if (before != null) predicates.add(cb.lessThan(root.<LocalDateTime>get("fechaHora"), before));
        if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.<LocalDateTime>get("fechaHora"), from));
        if (to != null) predicates.add(cb.lessThanOrEqualTo(root.<LocalDateTime>get("fechaHora"), to));
        if (participantId != null) {
            String userField = MensajeChatProyecto.class.equals(root.getJavaType()) ? "usuarioEmisor" : "usuario";
            predicates.add(cb.equal(root.get(userField).get("id"), participantId));
        }
        return predicates;
    }

    private String pattern(String value) {
        return "%" + value.trim().toLowerCase(Locale.ROOT) + "%";
    }
}
