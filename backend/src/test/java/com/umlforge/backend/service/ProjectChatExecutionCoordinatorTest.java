package com.umlforge.backend.service;

import org.junit.jupiter.api.Test;

import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectChatExecutionCoordinatorTest {
    @Test
    void serializaSolicitudesDelMismoProyecto() throws Exception {
        ProjectChatExecutionCoordinator coordinator = new ProjectChatExecutionCoordinator();
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch inicio = new CountDownLatch(1);
        AtomicInteger activos = new AtomicInteger();
        AtomicInteger maximos = new AtomicInteger();
        Callable<Integer> task = () -> {
            inicio.await();
            return coordinator.execute(9L, () -> {
                int actual = activos.incrementAndGet();
                maximos.accumulateAndGet(actual, Math::max);
                try { Thread.sleep(40); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
                activos.decrementAndGet();
                return actual;
            });
        };
        Future<Integer> a = pool.submit(task);
        Future<Integer> b = pool.submit(task);
        inicio.countDown();
        a.get(2, TimeUnit.SECONDS);
        b.get(2, TimeUnit.SECONDS);
        pool.shutdownNow();
        assertThat(maximos.get()).isEqualTo(1);
    }
}
