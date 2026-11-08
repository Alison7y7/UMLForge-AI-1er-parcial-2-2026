import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { MensajeChat, HistorialChatResponse, RecomendacionUml } from '../../types/chat.ts';
import { evaluateRecommendationStatus } from '../../utils/recommendationRevalidation.ts';

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
      assert.match(source, /aplicarRecomendacion\(revisandoMensajeId, revisandoRecomendacion\.id, destructive\)/);
      assert.match(source, /window\.confirm/);
    });

    it('CU17 muestra acción de revisión e informe estructurado compartido', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /Revisar diagrama con IA/);
      assert.match(source, /'REVISION_UML'/);
      assert.match(source, /Informe de revisión UML/);
      assert.match(source, /hallazgos/);
    });

    it('presenta alternativas incompatibles y exige elegir antes de revisar cambios', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /Alternativas de diseño/);
      assert.match(source, /Elegir esta alternativa/);
      assert.match(source, /Elegir no modifica el diagrama/);
      assert.match(source, /elegirAlternativa/);
      assert.match(source, /alternativaSeleccionadaId/);
    });

    it('CU18 distingue creación y eliminación de clases y recomendaciones obsoletas', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /AGREGAR_CLASE/);
      assert.match(source, /ELIMINAR_CLASE/);
      assert.match(source, /Obsoleta/);
      assert.match(source, /Descartada/);
      assert.match(source, /descartarRecomendacion/);
      assert.match(source, /Confirmar eliminación/);
    });

    it('CU17/CU18 Modal responsive: usa Portal a document.body, safe areas y evita recorte en móvil', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /createPortal/);
      assert.match(source, /document\.body/);
      assert.match(source, /h-\[92dvh\]/);
      assert.match(source, /safe-area-inset-bottom/);
      assert.match(source, /overscroll-contain/);
      assert.match(source, /closeRecommendationReview/);
      assert.match(source, /e\.key === 'Escape'/);
    });

    it('CU17/CU18 Vista previa UML estructurada: visualiza clase, responsabilidad, atributos, métodos y relaciones', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /UmlRecommendationPreview/);
      assert.match(source, /Responsabilidad y Justificación/);
      assert.match(source, /Atributos y tipos/);
      assert.match(source, /Métodos y retornos/);
      assert.match(source, /Relaciones propuestas/);
      assert.match(source, /Detalles técnicos completos \(JSON\)/);
      assert.match(source, /min-h-\[44px\]/);
    });

    it('CU17/CU18 Operaciones sobre existentes: muestra comparativa antes y después', () => {
      const source = readFileSync(new URL('./ProjectChat.tsx', import.meta.url), 'utf8');
      assert.match(source, /Antes \(Actual\)/);
      assert.match(source, /Después \(Propuesto\)/);
      assert.match(source, /Eliminación de la clase/);
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

    it('CU17/CU18 Permite revalidación y aplicación secuencial de Libro y Ejemplar de una misma revisión sin marcar obsoleta', () => {
      const recLibro: RecomendacionUml = {
        id: 'rec-libro',
        diagramaId: 5,
        versionDiagrama: 3,
        tipoCambio: 'AGREGAR_CLASE',
        descripcion: 'Crear clase Libro',
        elementoAfectado: { tipo: 'CLASE', id: '', nombre: 'Libro' },
        cambioPropuesto: { nombre: 'Libro', atributos: [{ nombre: 'titulo', tipo: 'String' }] },
      };

      const recEjemplar: RecomendacionUml = {
        id: 'rec-ejemplar',
        diagramaId: 5,
        versionDiagrama: 3,
        tipoCambio: 'AGREGAR_CLASE',
        descripcion: 'Crear clase Ejemplar con relación a Libro',
        elementoAfectado: { tipo: 'CLASE', id: '', nombre: 'Ejemplar' },
        cambioPropuesto: {
          nombre: 'Ejemplar',
          atributos: [{ nombre: 'codigo', tipo: 'String' }],
          relaciones: [{ destino: 'Libro', tipo: 'COMPOSICION' }],
        },
      };

      const revisionRecs = [recLibro, recEjemplar];
      const appliedIds = new Set<string>();
      const discardedIds = new Set<string>();

      // PASO 1: Antes de aplicar Libro en v3, Libro es compatible y Ejemplar detecta dependencia
      const evLibroInicial = evaluateRecommendationStatus(
        recLibro, appliedIds, discardedIds, 3, revisionRecs, []
      );
      assert.equal(evLibroInicial.status, 'COMPATIBLE');
      assert.equal(evLibroInicial.isApplyDisabled, false);

      const evEjemplarInicial = evaluateRecommendationStatus(
        recEjemplar, appliedIds, discardedIds, 3, revisionRecs, []
      );
      assert.equal(evEjemplarInicial.status, 'PENDIENTE_DEPENDENCIA');
      assert.equal(evEjemplarInicial.requiredDependency, 'Libro');
      assert.equal(evEjemplarInicial.isApplyDisabled, true);

      // PASO 2: Se aplica Libro. El diagrama avanza a v4 y ahora contiene a Libro
      appliedIds.add('rec-libro');
      const diagramClassesV4 = [{ id: 'uuid-libro-123', nombre: 'Libro' }];
      const currentVersionV4 = 4;

      // PASO 3: Revalidación de Ejemplar (originada en v3) contra el diagrama en v4
      const evEjemplarV4 = evaluateRecommendationStatus(
        recEjemplar, appliedIds, discardedIds, currentVersionV4, revisionRecs, diagramClassesV4
      );

      // Verificación clave: NO se marca como OBSOLETA a pesar de que versionDiagrama (3) !== currentVersion (4)
      assert.notEqual(evEjemplarV4.status, 'OBSOLETA', 'Ejemplar no debe ser marcado como obsoleta al incrementar versión');
      assert.equal(evEjemplarV4.status, 'COMPATIBLE');
      assert.equal(evEjemplarV4.revalidatedAgainstCurrentVersion, true);
      assert.equal(evEjemplarV4.isApplyDisabled, false, 'El botón de aplicar debe estar habilitado');
      assert.equal(evEjemplarV4.badgeLabel, 'Compatible (v4)');

      // PASO 4: Si Libro se intenta aplicar de nuevo, se detecta que ya existe en el diagrama
      const evLibroDuplicado = evaluateRecommendationStatus(
        recLibro, new Set(), discardedIds, currentVersionV4, revisionRecs, diagramClassesV4
      );
      assert.equal(evLibroDuplicado.status, 'OBSOLETA');
      assert.equal(evLibroDuplicado.isApplyDisabled, true);
      assert.match(evLibroDuplicado.reason || '', /ya existe en el modelo actual/i);
    });

    it('CU17/CU18 Detecta relaciones dependientes y dependencias rotas', () => {
      const recRelacionInvalida: RecomendacionUml = {
        id: 'rec-rel-invalida',
        diagramaId: 5,
        versionDiagrama: 3,
        tipoCambio: 'AGREGAR_RELACION',
        descripcion: 'Relacionar Inexistente con Otra',
        elementoAfectado: { tipo: 'CLASE', id: '', nombre: 'Inexistente' },
        cambioPropuesto: { origen: 'Inexistente', destino: 'Otra' },
      };

      const evInvalida = evaluateRecommendationStatus(
        recRelacionInvalida, new Set(), new Set(), 3, [recRelacionInvalida], [{ id: 'c1', nombre: 'Libro' }]
      );
      assert.equal(evInvalida.status, 'OBSOLETA');
      assert.equal(evInvalida.isApplyDisabled, true);
      assert.match(evInvalida.reason || '', /no existe en el diagrama/i);
    });
  });
});
