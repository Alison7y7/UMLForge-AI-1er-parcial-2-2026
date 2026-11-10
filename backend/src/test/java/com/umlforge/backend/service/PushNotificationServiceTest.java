package com.umlforge.backend.service;

import com.umlforge.backend.dto.MensajeChatResponse;
import com.umlforge.backend.entity.*;
import com.umlforge.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PushNotificationServiceTest {
    @Test void enviaSoloAMiembrosActivosDistintosDelActorYDeduplica() throws Exception {
        Fixture f = new Fixture(); Usuario actor=user(1L), member=user(2L), inactive=user(3L);
        Proyecto p=new Proyecto();p.setId(9L);p.setAnfitrion(actor);
        when(f.projects.findById(9L)).thenReturn(Optional.of(p));
        when(f.participants.findByProyectoId(9L)).thenReturn(List.of(participant(member,true),participant(inactive,false)));
        PushSubscription sub=subscription(member,20L); when(f.subscriptions.findByUsuarioIdAndActivaTrue(2L)).thenReturn(List.of(sub));
        when(f.gateway.send(eq(sub),anyString())).thenReturn(201);
        var event=new PushNotificationEvent("diagram:9:1",PushCategory.CAMBIO_UML,9L,1L,Set.of(),"Cambio","Guardado","/diagramas/4");
        PushPreference pref=new PushPreference();pref.setUsuario(member);pref.setCambiosUml(true);when(f.preferences.findByUsuarioId(2L)).thenReturn(Optional.of(pref));
        f.service.deliver(event);
        verify(f.gateway).send(eq(sub),contains("/diagramas/4")); verify(f.deliveries).save(any(PushDelivery.class));
        verify(f.subscriptions,never()).findByUsuarioIdAndActivaTrue(3L);
        when(f.deliveries.existsByEventKeyAndUsuarioIdAndSubscriptionId("diagram:9:1",2L,20L)).thenReturn(true);
        f.service.deliver(event); verify(f.gateway,times(1)).send(any(),anyString());
    }
    @Test void invalidaSuscripcionExpiradaSinBloquear() throws Exception {
        Fixture f=new Fixture();Usuario user=user(2L);PushSubscription sub=subscription(user,20L);
        when(f.subscriptions.findByUsuarioIdAndActivaTrue(2L)).thenReturn(List.of(sub));when(f.gateway.send(any(),anyString())).thenReturn(410);
        f.service.deliver(new PushNotificationEvent("invite:1",PushCategory.INVITACION,null,null,Set.of(2L),"Invitación","Proyecto","/dashboard"));
        assertThat(sub.isActiva()).isFalse();verify(f.subscriptions).save(sub);
    }

    @Test void sendTestNotificationInformaDiagnosticoReal() throws Exception {
        Fixture f = new Fixture(); Usuario user = user(5L);
        when(f.access.requireUser("test@user")).thenReturn(user);
        PushSubscription sub = subscription(user, 50L);
        when(f.subscriptions.findByUsuarioIdAndActivaTrue(5L)).thenReturn(List.of(sub));
        when(f.gateway.send(eq(sub), anyString())).thenReturn(201);

        var result = f.service.sendTestNotification("test@user");

        assertThat(result.success()).isTrue();
        assertThat(result.deliveredCount()).isEqualTo(1);
        assertThat(result.activeSubscriptions()).isEqualTo(1);
        assertThat(result.failedCount()).isEqualTo(0);
        verify(f.gateway).send(eq(sub), contains("/dashboard"));
    }

    @Test void sendTestNotificationFallaClaroSiNoHaySuscripciones() {
        Fixture f = new Fixture(); Usuario user = user(5L);
        when(f.access.requireUser("test@user")).thenReturn(user);
        when(f.subscriptions.findByUsuarioIdAndActivaTrue(5L)).thenReturn(List.of());

        var result = f.service.sendTestNotification("test@user");

        assertThat(result.success()).isFalse();
        assertThat(result.activeSubscriptions()).isEqualTo(0);
        assertThat(result.message()).contains("No tienes ningún dispositivo");
    }

    @Test void onChatMessageSinMencionesNoEnviaPushIndiscriminado() throws Exception {
        Fixture f = new Fixture();
        var mensaje = new MensajeChatResponse(100L, 9L, 1L, "Juan", TipoEmisorChat.USUARIO,
                "Hola a todos sin arroba", null, null, null, null, null, null);
        when(f.participants.findByProyectoId(9L)).thenReturn(List.of(participant(user(2L), true)));

        f.service.onChatMessage(new MensajeChatPublicadoEvent(9L, mensaje));

        verify(f.gateway, never()).send(any(), anyString());
    }
    static class Fixture {
        final PushSubscriptionRepository subscriptions=mock(PushSubscriptionRepository.class);final PushPreferenceRepository preferences=mock(PushPreferenceRepository.class);
        final PushDeliveryRepository deliveries=mock(PushDeliveryRepository.class);final ParticipanteProyectoRepository participants=mock(ParticipanteProyectoRepository.class);
        final ProyectoRepository projects=mock(ProyectoRepository.class);final ProjectAccessService access=mock(ProjectAccessService.class);final WebPushGateway gateway=mock(WebPushGateway.class);
        final PushNotificationService service=new PushNotificationService(subscriptions,preferences,deliveries,participants,projects,access,new ObjectMapper(),gateway);
        Fixture(){ReflectionTestUtils.setField(service,"publicKey","pub");ReflectionTestUtils.setField(service,"privateKey","priv");ReflectionTestUtils.setField(service,"enabled",true);}
    }
    static Usuario user(Long id){Usuario u=new Usuario();u.setId(id);u.setCorreo("u"+id+"@test");return u;}
    static ParticipanteProyecto participant(Usuario u,boolean active){ParticipanteProyecto p=new ParticipanteProyecto();p.setUsuario(u);p.setActivo(active);return p;}
    static PushSubscription subscription(Usuario u,Long id){PushSubscription s=new PushSubscription();ReflectionTestUtils.setField(s,"id",id);s.setUsuario(u);s.setEndpoint("https://push.example/"+id);s.setP256dh("key");s.setAuth("auth");s.setActiva(true);return s;}
}
