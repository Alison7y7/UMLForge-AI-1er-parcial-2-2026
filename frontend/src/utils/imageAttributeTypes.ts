import type { AttributeTypeOrigin, UmlAttribute, UmlModelJson } from '../types/uml';

export const updatePreviewAttributeType = (
  model: UmlModelJson,
  classId: string,
  attributeId: string,
  type: string
): UmlModelJson => ({
  ...model,
  clases: model.clases.map(umlClass => umlClass.id !== classId ? umlClass : {
    ...umlClass,
    atributos: umlClass.atributos.map(attribute => attribute.id !== attributeId ? attribute : {
      ...attribute,
      tipo: type,
      origenTipo: 'USUARIO'
    })
  })
});

export const attributeTypeOriginLabel = (attribute: UmlAttribute): string => {
  const labels: Record<AttributeTypeOrigin, string> = {
    IMAGEN: 'Detectado en imagen',
    SUGERIDO: 'Sugerido por IA',
    USUARIO: 'Corregido por usuario',
    INDETERMINADO: 'Pendiente de revisión'
  };

  return attribute.origenTipo
    ? labels[attribute.origenTipo]
    : attribute.tipo
      ? 'Origen no informado'
      : 'Pendiente de revisión';
};
