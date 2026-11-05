/**
 * Servicio intérprete de comandos de voz en español para el editor UML (CU14).
 * Procesa transcripciones de voz y las traduce a operaciones UML estructuradas.
 */

export type VoiceCommandType =
  | 'CREAR_CLASE'
  | 'AGREGAR_ATRIBUTO'
  | 'RELACIONAR_CLASES'
  | 'GUARDAR_DIAGRAMA'
  | 'CENTRAR_DIAGRAMA'
  | 'DESCONOCIDO';

export type UmlRelationType =
  | 'ASOCIACION'
  | 'AGREGACION'
  | 'COMPOSICION'
  | 'HERENCIA'
  | 'DEPENDENCIA';

export interface VoiceCommandPayload {
  nombreClase?: string;
  atributo?: {
    nombre: string;
    tipo: string;
    visibilidad?: 'public' | 'private' | 'protected' | 'unspecified';
  };
  origenClase?: string;
  destinoClase?: string;
  tipoRelacion?: UmlRelationType;
}

export interface VoiceCommand {
  tipo: VoiceCommandType;
  rawTranscript: string;
  descripcion: string;
  requierePermisoEdicion: boolean;
  esModificacionDiagrama: boolean;
  payload?: VoiceCommandPayload;
  error?: string;
}

export interface NodeReference {
  id: string;
  nombre: string;
}

/**
 * Normaliza una cadena removiendo puntuaciones finales y espacios extra.
 */
function cleanText(text: string): string {
  return (text || '')
    .trim()
    .replace(/[.,;:!?]+$/, '')
    .trim();
}

/**
 * Capitaliza la primera letra de un nombre de clase si no lo está.
 */
function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Mapea nombres de tipos comunes en lenguaje natural a tipos estándar.
 */
function normalizeType(rawType: string): string {
  const clean = cleanText(rawType);
  const lower = clean.toLowerCase();
  switch (lower) {
    case 'string':
    case 'texto':
    case 'cadena':
      return 'String';
    case 'int':
    case 'entero':
    case 'integer':
      return 'Integer';
    case 'long':
      return 'Long';
    case 'double':
    case 'decimal':
      return 'Double';
    case 'float':
      return 'Float';
    case 'boolean':
    case 'booleano':
      return 'Boolean';
    case 'date':
    case 'fecha':
      return 'LocalDate';
    case 'datetime':
    case 'fechahora':
    case 'fechayhora':
      return 'LocalDateTime';
    case 'bigdecimal':
      return 'BigDecimal';
    default:
      return clean;
  }
}

/**
 * Mapea nombres de relaciones en español al enumerador UmlRelationType.
 */
function parseRelationType(text?: string): UmlRelationType {
  if (!text) return 'ASOCIACION';
  const clean = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (clean.includes('agregacion')) return 'AGREGACION';
  if (clean.includes('composicion')) return 'COMPOSICION';
  if (clean.includes('herencia') || clean.includes('generalizacion')) return 'HERENCIA';
  if (clean.includes('dependencia')) return 'DEPENDENCIA';
  return 'ASOCIACION';
}

/**
 * Busca un nodo existente por nombre (insensible a mayúsculas/minúsculas y acentos).
 */
export function findNodeByName(nodes: NodeReference[], name: string): NodeReference | undefined {
  if (!name) return undefined;
  const target = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return nodes.find(n => {
    const current = (n.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return current === target;
  });
}

/**
 * Interpreta una transcripción de voz en español y genera un comando estructurado.
 * 
 * Comandos reconocidos:
 * 1. «Crear clase [Nombre]» / «Crea la clase [Nombre]» / «Nueva clase [Nombre]»
 * 2. «Agregar atributo [nombre] de tipo [tipo] a [Clase]»
 * 3. «Relacionar [Origen] con [Destino] mediante [tipoRelacion]»
 * 4. «Guardar diagrama» / «Guardar» / «Guardar cambios»
 * 5. «Centrar diagrama» / «Centrar vista» / «Centrar el lienzo»
 */
export function interpretVoiceCommand(
  transcript: string,
  existingNodes: NodeReference[] = []
): VoiceCommand {
  const raw = cleanText(transcript);
  if (!raw) {
    return {
      tipo: 'DESCONOCIDO',
      rawTranscript: transcript,
      descripcion: 'No se detectó ningún comando de voz',
      requierePermisoEdicion: false,
      esModificacionDiagrama: false,
      error: 'No se detectó texto en el comando.'
    };
  }

  // 1. GUARDAR DIAGRAMA
  // Ej: "Guardar diagrama", "Guardar cambios", "Guarda el diagrama", "Guardar"
  if (/^(?:guardar|guarda)(?:\s+(?:el\s+)?(?:diagrama|cambios))?$/i.test(raw)) {
    return {
      tipo: 'GUARDAR_DIAGRAMA',
      rawTranscript: raw,
      descripcion: 'Guardar cambios del diagrama en el servidor',
      requierePermisoEdicion: true,
      esModificacionDiagrama: true
    };
  }

  // 2. CENTRAR DIAGRAMA
  // Ej: "Centrar diagrama", "Centrar vista", "Centrar", "Centrar el lienzo", "Ajustar vista"
  if (/^(?:centrar|ajustar)(?:\s+(?:el\s+)?(?:diagrama|vista|lienzo))?$/i.test(raw)) {
    return {
      tipo: 'CENTRAR_DIAGRAMA',
      rawTranscript: raw,
      descripcion: 'Centrar y encuadrar la vista del diagrama',
      requierePermisoEdicion: false,
      esModificacionDiagrama: false
    };
  }

  // 3. CREAR CLASE
  // Ej: "Crear clase Cliente", "Crea la clase Factura", "Nueva clase Producto", "Añadir clase Detalle"
  const createClassRegex = /^(?:crear|crea|nueva|nuevo|añadir|añade|agregar|agrega)(?:\s+la|\s+el|\s+una|\s+un)?\s+clase\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)$/i;
  const createClassMatch = raw.match(createClassRegex);
  if (createClassMatch) {
    const rawClassName = cleanText(createClassMatch[1]);
    const className = capitalizeFirst(rawClassName);
    
    // Verificar si ya existe una clase con ese nombre
    const existing = findNodeByName(existingNodes, className);
    if (existing) {
      return {
        tipo: 'CREAR_CLASE',
        rawTranscript: raw,
        descripcion: `Crear clase «${className}»`,
        requierePermisoEdicion: true,
        esModificacionDiagrama: true,
        payload: { nombreClase: className },
        error: `Ya existe una clase con el nombre «${existing.nombre}» en el diagrama.`
      };
    }

    return {
      tipo: 'CREAR_CLASE',
      rawTranscript: raw,
      descripcion: `Crear clase «${className}»`,
      requierePermisoEdicion: true,
      esModificacionDiagrama: true,
      payload: { nombreClase: className }
    };
  }

  // 4. AGREGAR ATRIBUTO
  // Ej: "Agregar atributo nombre de tipo String a Cliente"
  // Ej: "Añadir atributo precio de tipo Double a la clase Producto"
  // Ej: "Agregar atributo fecha tipo LocalDate en Pedido"
  const addAttrRegex = /^(?:agregar|agrega|añadir|añade|crear|crea)(?:\s+el)?\s+atributo\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)\s+(?:de\s+tipo|tipo)\s+([a-zA-Z0-9_<>,\[\]]+)\s+(?:a|en|para)(?:\s+la\s+clase)?\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)$/i;
  const addAttrMatch = raw.match(addAttrRegex);
  if (addAttrMatch) {
    const attrName = cleanText(addAttrMatch[1]);
    const attrType = normalizeType(addAttrMatch[2]);
    const rawTargetClass = cleanText(addAttrMatch[3]);

    const targetNode = findNodeByName(existingNodes, rawTargetClass);
    if (!targetNode) {
      return {
        tipo: 'AGREGAR_ATRIBUTO',
        rawTranscript: raw,
        descripcion: `Agregar atributo «${attrName}: ${attrType}» a la clase «${capitalizeFirst(rawTargetClass)}»`,
        requierePermisoEdicion: true,
        esModificacionDiagrama: true,
        payload: {
          nombreClase: rawTargetClass,
          atributo: { nombre: attrName, tipo: attrType, visibilidad: 'private' }
        },
        error: `No se encontró la clase «${rawTargetClass}» en el diagrama. Comprueba el nombre o créala primero.`
      };
    }

    return {
      tipo: 'AGREGAR_ATRIBUTO',
      rawTranscript: raw,
      descripcion: `Agregar atributo «${attrName}: ${attrType}» a la clase «${targetNode.nombre}»`,
      requierePermisoEdicion: true,
      esModificacionDiagrama: true,
      payload: {
        nombreClase: targetNode.nombre,
        atributo: { nombre: attrName, tipo: attrType, visibilidad: 'private' }
      }
    };
  }

  // 5. RELACIONAR CLASES
  // Ej: "Relacionar Cliente con Pedido mediante asociación"
  // Ej: "Relacionar Cliente y Pedido mediante asociacion"
  // Ej: "Relacionar Persona con Empleado mediante herencia"
  // Ej: "Relacionar Factura con Item mediante composición"
  // Ej: "Relacionar Auto con Motor mediante agregación"
  // Ej: "Relacionar Cliente con Pedido" (por defecto Asociación)
  const relateRegex = /^(?:relacionar|conectar|vincular|unir)\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)\s+(?:con|y|a)\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+)(?:\s+(?:mediante|con|por|de\s+tipo)\s+([a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+))?$/i;
  const relateMatch = raw.match(relateRegex);
  if (relateMatch) {
    const rawSource = cleanText(relateMatch[1]);
    const rawTarget = cleanText(relateMatch[2]);
    const relationType = parseRelationType(relateMatch[3]);

    const sourceNode = findNodeByName(existingNodes, rawSource);
    const targetNode = findNodeByName(existingNodes, rawTarget);

    const relationLabels: Record<UmlRelationType, string> = {
      ASOCIACION: 'Asociación',
      AGREGACION: 'Agregación',
      COMPOSICION: 'Composición',
      HERENCIA: 'Generalización (Herencia)',
      DEPENDENCIA: 'Dependencia'
    };

    if (!sourceNode && !targetNode) {
      return {
        tipo: 'RELACIONAR_CLASES',
        rawTranscript: raw,
        descripcion: `Relacionar «${capitalizeFirst(rawSource)}» con «${capitalizeFirst(rawTarget)}» mediante ${relationLabels[relationType]}`,
        requierePermisoEdicion: true,
        esModificacionDiagrama: true,
        payload: { origenClase: rawSource, destinoClase: rawTarget, tipoRelacion: relationType },
        error: `No se encontraron las clases «${rawSource}» ni «${rawTarget}» en el diagrama.`
      };
    }

    if (!sourceNode) {
      return {
        tipo: 'RELACIONAR_CLASES',
        rawTranscript: raw,
        descripcion: `Relacionar «${capitalizeFirst(rawSource)}» con «${targetNode?.nombre}» mediante ${relationLabels[relationType]}`,
        requierePermisoEdicion: true,
        esModificacionDiagrama: true,
        payload: { origenClase: rawSource, destinoClase: targetNode?.nombre, tipoRelacion: relationType },
        error: `No se encontró la clase de origen «${rawSource}» en el diagrama.`
      };
    }

    if (!targetNode) {
      return {
        tipo: 'RELACIONAR_CLASES',
        rawTranscript: raw,
        descripcion: `Relacionar «${sourceNode.nombre}» con «${capitalizeFirst(rawTarget)}» mediante ${relationLabels[relationType]}`,
        requierePermisoEdicion: true,
        esModificacionDiagrama: true,
        payload: { origenClase: sourceNode.nombre, destinoClase: rawTarget, tipoRelacion: relationType },
        error: `No se encontró la clase de destino «${rawTarget}» en el diagrama.`
      };
    }

    return {
      tipo: 'RELACIONAR_CLASES',
      rawTranscript: raw,
      descripcion: `Relacionar «${sourceNode.nombre}» con «${targetNode.nombre}» mediante ${relationLabels[relationType]}`,
      requierePermisoEdicion: true,
      esModificacionDiagrama: true,
      payload: {
        origenClase: sourceNode.nombre,
        destinoClase: targetNode.nombre,
        tipoRelacion: relationType
      }
    };
  }

  // 6. COMANDO DESCONOCIDO O NO RECONOCIDO
  return {
    tipo: 'DESCONOCIDO',
    rawTranscript: raw,
    descripcion: `Comando no reconocido: «${raw}»`,
    requierePermisoEdicion: false,
    esModificacionDiagrama: false,
    error: `No se pudo interpretar el comando «${raw}». Prueba con: «Crear clase [Nombre]», «Agregar atributo [nombre] de tipo [tipo] a [Clase]», «Relacionar [A] con [B] mediante asociación», «Guardar diagrama» o «Centrar diagrama».`
  };
}
