package com.umlforge.backend.service.ia;

final class UmlPromptFactory {

    private UmlPromptFactory() {}

    static String buildForOllama(String userPrompt) {
        return """
            Eres un generador de modelos UML para UMLForge-AI.
            Convierte la descripción del usuario en un diagrama de clases UML.

            REGLAS OBLIGATORIAS:
            - Devuelve únicamente un objeto JSON válido.
            - No uses Markdown, bloques de código, comentarios ni explicaciones.
            - Prioriza generar contenido útil. Nunca devuelvas el arreglo clases vacío.
            - Genera siempre al menos una clase relacionada con la descripción.
            - Cada clase debe incluir como mínimo el atributo id de tipo Long.
            - Genera las clases, atributos y relaciones necesarias; no omitas contenido para simplificar la respuesta.
            - Los únicos tipos permitidos para atributos, parámetros y retornos son: Long, String, Integer, Double, Boolean, LocalDate.
            - Las únicas visibilidades permitidas son: public, private, protected.
            - Los únicos tipos de relación permitidos son: ASOCIACION, AGREGACION, COMPOSICION, GENERALIZACION.
            - Las únicas multiplicidades permitidas son: 1, 0..1, 0..*, *.
            - Todos los id deben ser cadenas únicas y no vacías en todo el modelo.
            - origen y destino deben contener el id de una clase existente, no su nombre.
            - clases, atributos, metodos, parametros y relaciones siempre deben ser arreglos JSON, nunca null.
            - Distribuye las clases en posiciones distintas para evitar superposiciones.

            FORMATO EXACTO DE RESPUESTA:
            {
              "clases": [
                {
                  "id": "clase-identificador-unico",
                  "nombre": "NombreClase",
                  "estereotipo": "entity",
                  "posicionX": 100.0,
                  "posicionY": 100.0,
                  "atributos": [
                    {
                      "id": "atributo-identificador-unico",
                      "nombre": "id",
                      "tipo": "Long",
                      "visibilidad": "private"
                    }
                  ],
                  "metodos": []
                }
              ],
              "relaciones": [
                {
                  "id": "relacion-identificador-unico",
                  "origen": "id-clase-origen",
                  "destino": "id-clase-destino",
                  "tipo": "ASOCIACION",
                  "nombre": "nombreRelacion",
                  "multiplicidadOrigen": "1",
                  "multiplicidadDestino": "0..*"
                }
              ]
            }

            Si no existen relaciones claras, devuelve relaciones como [], pero clases nunca puede ser [].

            DESCRIPCIÓN DEL USUARIO:
            """ + userPrompt;
    }

    static String build(String userPrompt) {
        return """
            Eres un arquitecto de software experto en UML. Convierte la solicitud del usuario en un
            diagrama de clases y responde EXCLUSIVAMENTE con JSON válido, sin Markdown ni explicaciones.

            El objeto debe tener exactamente esta estructura:
            {
              "clases": [{
                "id": "identificador-unico",
                "nombre": "NombreClase",
                "estereotipo": "entity",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [{"id":"id-unico","nombre":"nombre","tipo":"String","visibilidad":"private"}],
                "metodos": [{"id":"id-unico","nombre":"operacion","tipoRetorno":"void","visibilidad":"public","parametros":[]}]
              }],
              "relaciones": [{
                "id": "id-unico",
                "origen": "id-clase-origen",
                "destino": "id-clase-destino",
                "tipo": "ASOCIACION",
                "nombre": "nombreRelacion",
                "multiplicidadOrigen": "1",
                "multiplicidadDestino": "0..*"
              }]
            }

            Reglas:
            - tipos de relación permitidos: ASOCIACION, HERENCIA, AGREGACION, COMPOSICION, GENERALIZACION, DEPENDENCIA;
            - visibilidades permitidas: public, private, protected;
            - todos los ids deben ser únicos y las relaciones deben referenciar ids de clases existentes;
            - atributos, metodos, parametros, clases y relaciones nunca deben ser null;
            - distribuye las clases en una cuadrícula sin superponerlas;
            - incluye multiplicidades UML coherentes.

            Solicitud del usuario:
            """ + userPrompt;
    }
}
