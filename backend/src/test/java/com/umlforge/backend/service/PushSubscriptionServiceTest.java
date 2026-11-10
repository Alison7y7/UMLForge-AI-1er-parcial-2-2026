package com.umlforge.backend.service;

import com.umlforge.backend.dto.*;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PushSubscriptionServiceTest {
    @Test void registraSuscripcionAutenticadaYPreferenciasIniciales() {
        var subscriptions = mock(PushSubscriptionRepository.class); var prefs = mock(PushPreferenceRepository.class);
        var access = mock(ProjectAccessService.class); Usuario user = user(3L);
        when(access.requireUser("ana@test")).thenReturn(user); when(subscriptions.findByEndpoint(anyString())).thenReturn(Optional.empty());
        when(prefs.findByUsuarioId(3L)).thenReturn(Optional.empty()); when(prefs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(subscriptions.existsByUsuarioIdAndActivaTrue(3L)).thenReturn(true);
        var service = service(subscriptions,prefs,access);
        var result = service.subscribe(new PushSubscriptionRequest("https://push.example/sub", "public", "auth", "Chrome"), "ana@test");
        assertThat(result.subscribed()).isTrue(); assertThat(result.invitaciones()).isTrue(); assertThat(result.cambiosUml()).isFalse();
        verify(subscriptions).save(argThat(s -> s.getUsuario().getId().equals(3L) && s.isActiva()));
    }

    @Test void reasignaDispositivoCompartidoAUsuarioActual() {
        var subscriptions = mock(PushSubscriptionRepository.class); var prefs = mock(PushPreferenceRepository.class);
        var access = mock(ProjectAccessService.class); Usuario previousOwner = user(1L), currentUser = user(2L);
        PushSubscription existing = new PushSubscription(); existing.setUsuario(previousOwner); existing.setEndpoint("https://push.example/sub");
        ReflectionTestUtils.setField(existing,"id",8L);
        when(access.requireUser("user2@test")).thenReturn(currentUser);
        when(subscriptions.findByEndpoint(anyString())).thenReturn(Optional.of(existing));
        when(prefs.findByUsuarioId(2L)).thenReturn(Optional.empty());
        when(prefs.save(any())).thenAnswer(i -> i.getArgument(0));
        when(subscriptions.existsByUsuarioIdAndActivaTrue(2L)).thenReturn(true);

        var result = service(subscriptions,prefs,access).subscribe(
                new PushSubscriptionRequest(existing.getEndpoint(),"key","auth","Chrome Android"),"user2@test");

        assertThat(result.subscribed()).isTrue();
        verify(subscriptions).save(argThat(s -> s.getUsuario().getId().equals(2L) && s.isActiva()));
    }

    @Test void eliminaSoloLaSuscripcionPropia() {
        var subscriptions = mock(PushSubscriptionRepository.class); var prefs = mock(PushPreferenceRepository.class);
        var access = mock(ProjectAccessService.class); when(access.requireUser("ana@test")).thenReturn(user(3L));
        service(subscriptions,prefs,access).unsubscribe(new PushUnsubscribeRequest("https://push.example/sub"),"ana@test");
        verify(subscriptions).deleteByEndpointAndUsuarioId("https://push.example/sub",3L);
    }
    @Test void rechazaEndpointsLocalesParaEvitarSsrf() {
        var subscriptions = mock(PushSubscriptionRepository.class); var prefs = mock(PushPreferenceRepository.class);
        var access = mock(ProjectAccessService.class); when(access.requireUser("ana@test")).thenReturn(user(3L));
        assertThatThrownBy(() -> service(subscriptions,prefs,access).subscribe(
                new PushSubscriptionRequest("https://127.0.0.1/private","key","auth","x"),"ana@test"))
                .isInstanceOf(ResponseStatusException.class);
        verify(subscriptions,never()).save(any());
    }
    private PushSubscriptionService service(PushSubscriptionRepository s, PushPreferenceRepository p, ProjectAccessService a) {
        var service = new PushSubscriptionService(s,p,a); ReflectionTestUtils.setField(service,"publicKey","pub");
        ReflectionTestUtils.setField(service,"privateKey","priv"); ReflectionTestUtils.setField(service,"enabled",true); return service;
    }
    private Usuario user(Long id) { Usuario u=new Usuario();u.setId(id);u.setCorreo("u@test");return u; }
}
