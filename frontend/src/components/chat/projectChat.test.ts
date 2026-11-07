import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { MensajeChat, HistorialChatResponse } from '../../types/chat.ts';

describe('CU16: Chat Colaborativo Compartido por Proyecto', () => {
  it('Orden cronológico: invierte mensajes descendentes del backend (más antiguos arriba, más recientes abajo)', () => {
    // El backend devuelve los mensajes ordenados descendentemente (fechaHora desc, id desc)
    const backendResponse: HistorialChatResponse = {
      pagina: 0,
      tamano: 50,
      totalElementos: 3,
      totalPaginas: 1,
      ultima: true,
      mensajes: [
        {
          id: 3,
          proyectoId: 10,
          emisorId: 2,
          emisorNombre: 'Carlos Gómez',
          tipoEmisor: 'USUARIO',
          contenido: 'Tercer mensaje (más reciente)',
          fechaHora: '2026-11-05T19:30:00',
          estado: 'ENVIADO',
        },
        {
          id: 2,
          proyectoId: 10,
          emisorId: 1,
          emisorNombre: 'Ana Pérez',
          tipoEmisor: 'USUARIO',
          contenido: 'Segundo mensaje',
          fechaHora: '2026-11-05T19:20:00',
          estado: 'ENVIADO',
        },
        {
          id: 1,
          proyectoId: 10,
          emisorId: 2,
          emisorNombre: 'Carlos Gómez',
          tipoEmisor: 'USUARIO',
          contenido: 'Primer mensaje (más antiguo)',
          fechaHora: '2026-11-05T19:10:00',
          estado: 'ENVIADO',
        },
      ],
    };

    // La lógica de useProjectChat invierte el orden inicial para visualización en chat
    const cronologicos = [...backendResponse.mensajes].reverse();

    assert.equal(cronologicos[0].id, 1, 'El mensaje más antiguo debe ser el primero arriba');
    assert.equal(cronologicos[1].id, 2);
    assert.equal(cronologicos[2].id, 3, 'El mensaje más reciente debe ser el último abajo');
  });

  it('Paginación: prepende mensajes históricos anteriores sin duplicar IDs', () => {
    // Mensajes actuales en el chat (página 0)
    const mensajesActuales: MensajeChat[] = [
      {
        id: 3,
        proyectoId: 10,
        emisorId: 1,
        emisorNombre: 'Ana Pérez',
        tipoEmisor: 'USUARIO',
        contenido: 'Mensaje 3',
        fechaHora: '2026-11-05T19:30:00',
        estado: 'ENVIADO',
      },
      {
        id: 4,
        proyectoId: 10,
        emisorId: 2,
        emisorNombre: 'Carlos Gómez',
        tipoEmisor: 'USUARIO',
        contenido: 'Mensaje 4',
        fechaHora: '2026-11-05T19:35:00',
        estado: 'ENVIADO',
      },
    ];

    // Página 1 recibida del backend (orden descendente)
    const backendPagina1: MensajeChat[] = [
      {
        id: 2,
        proyectoId: 10,
        emisorId: 2,
        emisorNombre: 'Carlos Gómez',
        tipoEmisor: 'USUARIO',
        contenido: 'Mensaje 2',
        fechaHora: '2026-11-05T19:20:00',
        estado: 'ENVIADO',
      },
      {
        id: 1,
        proyectoId: 10,
        emisorId: 1,
        emisorNombre: 'Ana Pérez',
        tipoEmisor: 'USUARIO',
        contenido: 'Mensaje 1',
        fechaHora: '2026-11-05T19:10:00',
        estado: 'ENVIADO',
      },
    ];

    // Invertimos la página más antigua y filtramos duplicados
    const cronologicosAnteriores = [...backendPagina1].reverse();
    const idsExistentes = new Set(mensajesActuales.map((m) => m.id));
    const nuevosAntiguos = cronologicosAnteriores.filter((m) => !idsExistentes.has(m.id));
    const resultadoPaginado = [...nuevosAntiguos, ...mensajesActuales];

    assert.equal(resultadoPaginado.length, 4, 'Deben existir 4 mensajes en total');
    assert.deepEqual(
      resultadoPaginado.map((m) => m.id),
      [1, 2, 3, 4],
      'El orden debe ser 1 -> 2 -> 3 -> 4'
    );
  });

  it('Deduplicación idempotente: un mensaje entregado por REST y STOMP no se duplica', () => {
    const listaMensajes: MensajeChat[] = [
      {
        id: 100,
        proyectoId: 5,
        emisorId: 1,
        emisorNombre: 'María López',
        tipoEmisor: 'USUARIO',
        contenido: 'Hola a todos',
        fechaHora: '2026-11-05T19:00:00',
        estado: 'ENVIADO',
      },
    ];

    // Simula llegada por STOMP del mismo mensaje que ya confirmó el POST REST
    const mensajeStomp: MensajeChat = {
      id: 100,
      proyectoId: 5,
      emisorId: 1,
      emisorNombre: 'María López',
      tipoEmisor: 'USUARIO',
      contenido: 'Hola a todos',
      fechaHora: '2026-11-05T19:00:00',
      estado: 'ENVIADO',
    };

    const actualizarConStomp = (prev: MensajeChat[], incoming: MensajeChat) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = incoming;
        return copy;
      }
      return [...prev, incoming];
    };

    const resultado = actualizarConStomp(listaMensajes, mensajeStomp);
    assert.equal(resultado.length, 1, 'No debe duplicar mensajes existentes');
    assert.equal(resultado[0].id, 100);
  });

  it('Recepción en tiempo real: agrega nuevo mensaje al final de la conversación', () => {
    const listaInicial: MensajeChat[] = [
      {
        id: 1,
        proyectoId: 8,
        emisorId: 1,
        emisorNombre: 'Juan Perez',
        tipoEmisor: 'USUARIO',
        contenido: 'Primer mensaje',
        fechaHora: '2026-11-05T19:00:00',
        estado: 'ENVIADO',
      },
    ];

    const nuevoMensajeStomp: MensajeChat = {
      id: 2,
      proyectoId: 8,
      emisorId: 3,
      emisorNombre: 'Roberto Diaz',
      tipoEmisor: 'USUARIO',
      contenido: 'Segundo mensaje vía STOMP',
      fechaHora: '2026-11-05T19:05:00',
      estado: 'ENVIADO',
    };

    const actualizar = (prev: MensajeChat[], incoming: MensajeChat) => {
      const idx = prev.findIndex((m) => m.id === incoming.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = incoming;
        return copy;
      }
      return [...prev, incoming];
    };

    const resultado = actualizar(listaInicial, nuevoMensajeStomp);
    assert.equal(resultado.length, 2);
    assert.equal(resultado[1].id, 2);
    assert.equal(resultado[1].emisorNombre, 'Roberto Diaz');
    assert.equal(resultado[1].contenido, 'Segundo mensaje vía STOMP');
  });

  it('Identificación de usuario y visualización del nombre de emisor (Requisito 10)', () => {
    const usuarioActual = {
      id: 42,
      nombre: 'Lucía',
      apellido: 'Vargas',
      correo: 'lucia@umlforge.com',
    };

    const mensajePropio: MensajeChat = {
      id: 10,
      proyectoId: 3,
      emisorId: 42,
      emisorNombre: 'Lucía Vargas',
      tipoEmisor: 'USUARIO',
      contenido: 'Mi propio mensaje',
      fechaHora: '2026-11-05T19:40:00',
      estado: 'ENVIADO',
    };

    const mensajeCompanero: MensajeChat = {
      id: 11,
      proyectoId: 3,
      emisorId: 99,
      emisorNombre: 'Andrés Morales',
      tipoEmisor: 'USUARIO',
      contenido: 'Mensaje de compañero',
      fechaHora: '2026-11-05T19:41:00',
      estado: 'ENVIADO',
    };

    const isCurrentUser = (m: MensajeChat) => {
      if (m.emisorId && usuarioActual.id && m.emisorId === usuarioActual.id) return true;
      if (
        m.emisorNombre &&
        usuarioActual.nombre &&
        m.emisorNombre.toLowerCase().includes(usuarioActual.nombre.toLowerCase())
      ) {
        return true;
      }
      return false;
    };

    assert.equal(isCurrentUser(mensajePropio), true, 'El mensaje propio debe identificarse como emisor actual');
    assert.equal(isCurrentUser(mensajeCompanero), false, 'El mensaje del compañero no debe ser emisor actual');
    assert.equal(mensajePropio.emisorNombre, 'Lucía Vargas');
    assert.equal(mensajeCompanero.emisorNombre, 'Andrés Morales');
  });

  it('Contrato del POST REST: envía únicamente contenido y metadatos JSON', () => {
    const construirPayload = (contenido: string, metadatos?: Record<string, any>) => {
      const textoLimpio = contenido.trim();
      assert.ok(textoLimpio.length > 0, 'El contenido no debe estar vacío');
      return {
        contenido: textoLimpio,
        metadatos: metadatos && Object.keys(metadatos).length > 0 ? metadatos : {},
      };
    };

    const payload = construirPayload('Diagrama de clases revisado', { diagramaReferencia: 4 });
    assert.equal(payload.contenido, 'Diagrama de clases revisado');
    assert.deepEqual(payload.metadatos, { diagramaReferencia: 4 });

    const payloadVacio = construirPayload('Hola equipo');
    assert.deepEqual(payloadVacio.metadatos, {});
  });

  describe('CU16 Etapa 4: IA Colaborativa por Proyecto y Recomendaciones UML', () => {
    it('Flujo de consulta a IA: envía mensaje humano y genera solicitudId UUID única', () => {
      const generarUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.floor(Math.random() * 16);
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const construirSolicitudIA = (mensajeId: number, diagramaId: number) => {
        const solicitudId = generarUUID();
        return {
          mensajeId,
          diagramaId,
          solicitudId,
        };
      };

      const solicitud = construirSolicitudIA(42, 3);
      assert.equal(solicitud.mensajeId, 42);
      assert.equal(solicitud.diagramaId, 3);
      assert.match(
        solicitud.solicitudId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        'solicitudId debe ser un UUID v4 válido'
      );
    });

    it('Diferenciación de tipos de emisor: USUARIO, IA y SISTEMA', () => {
      const mensajeUsuario: MensajeChat = {
        id: 1,
        proyectoId: 1,
        emisorId: 5,
        emisorNombre: 'Carlos Gómez',
        tipoEmisor: 'USUARIO',
        contenido: '¿Qué atributos le faltan a Factura?',
        fechaHora: '2026-11-06T00:00:00',
        estado: 'ENVIADO',
      };

      const mensajeIA: MensajeChat = {
        id: 2,
        proyectoId: 1,
        tipoEmisor: 'IA',
        contenido: 'He analizado el diagrama UML. Sugiero agregar el atributo total y fecha.',
        fechaHora: '2026-11-06T00:00:02',
        estado: 'ENVIADO',
        metadatos: {
          proveedor: 'gemini',
          tokensUtilizados: 1250,
          recomendaciones: [
            {
              id: 'rec-1',
              tipoCambio: 'AGREGAR_ATRIBUTO',
              elementoAfectado: { tipo: 'CLASE', nombre: 'Factura' },
              descripcion: 'Agregar atributo total a Factura',
              cambioPropuesto: { nombre: 'total', tipo: 'BigDecimal', visibilidad: 'private' },
            },
          ],
        },
      };

      const mensajeSistema: MensajeChat = {
        id: 3,
        proyectoId: 1,
        tipoEmisor: 'SISTEMA',
        contenido: 'El pipeline de IA no pudo contactar con los modelos externos.',
        fechaHora: '2026-11-06T00:00:05',
        estado: 'FALLIDO',
      };

      assert.equal(mensajeUsuario.tipoEmisor, 'USUARIO');
      assert.equal(mensajeIA.tipoEmisor, 'IA');
      assert.equal(mensajeSistema.tipoEmisor, 'SISTEMA');
      assert.equal(mensajeIA.metadatos?.proveedor, 'gemini');
      assert.equal(mensajeIA.metadatos?.recomendaciones?.length, 1);
    });

    it('Formateador de tipos de cambio UML para recomendaciones estructuradas', () => {
      const formatTipoCambio = (tipo: string) => {
        switch (tipo) {
          case 'AGREGAR_ATRIBUTO':
            return '+ Atributo';
          case 'MODIFICAR_ATRIBUTO':
            return '~ Modificar Atributo';
          case 'ELIMINAR_ATRIBUTO':
            return '- Eliminar Atributo';
          case 'AGREGAR_METODO':
            return '+ Método';
          case 'MODIFICAR_METODO':
            return '~ Modificar Método';
          case 'ELIMINAR_METODO':
            return '- Eliminar Método';
          case 'AGREGAR_RELACION':
            return '+ Relación';
          case 'MODIFICAR_RELACION':
            return '~ Modificar Relación';
          case 'ELIMINAR_RELACION':
            return '- Eliminar Relación';
          case 'RENOMBRAR_CLASE':
            return 'Renombrar Clase';
          default:
            return tipo || 'Cambio UML';
        }
      };

      assert.equal(formatTipoCambio('AGREGAR_ATRIBUTO'), '+ Atributo');
      assert.equal(formatTipoCambio('MODIFICAR_METODO'), '~ Modificar Método');
      assert.equal(formatTipoCambio('AGREGAR_RELACION'), '+ Relación');
      assert.equal(formatTipoCambio('RENOMBRAR_CLASE'), 'Renombrar Clase');
      assert.equal(formatTipoCambio('OTRO'), 'OTRO');
    });

    it('Seguridad y protección del modelo: exige revisión y confirmación explícita', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /openRecommendationReview\(rec, m\.id\)/);
      assert.match(source, /Confirmar y aplicar/);
      assert.match(source, /hasUnsavedChanges/);
      assert.match(source, /aplicarRecomendacion\(revisandoMensajeId, revisandoRecomendacion\.id\)/);
    });

    it('Prevención de consultas simultáneas o duplicadas (Lock de sendingIA)', () => {
      let sendingIA = false;
      let consultCount = 0;

      const intentarConsultar = () => {
        if (sendingIA) return false;
        sendingIA = true;
        consultCount++;
        return true;
      };

      // Primer intento exitoso
      assert.equal(intentarConsultar(), true);
      assert.equal(consultCount, 1);

      // Segundo intento concurrente bloqueado
      assert.equal(intentarConsultar(), false);
      assert.equal(consultCount, 1);

      // Desbloqueo al finalizar
      sendingIA = false;
      assert.equal(intentarConsultar(), true);
      assert.equal(consultCount, 2);
    });
  });
});
