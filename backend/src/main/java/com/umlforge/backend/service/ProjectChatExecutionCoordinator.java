package com.umlforge.backend.service;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

@Component
public class ProjectChatExecutionCoordinator {
    private final ConcurrentHashMap<Long, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T execute(Long projectId, Supplier<T> task) {
        ReentrantLock lock = locks.computeIfAbsent(projectId, ignored -> new ReentrantLock(true));
        lock.lock();
        try {
            return task.get();
        } finally {
            lock.unlock();
            if (!lock.hasQueuedThreads()) locks.remove(projectId, lock);
        }
    }
}
