package com.umlforge.backend.service.ia;

final class UmlPromptFactory {

    private UmlPromptFactory() {}

    static String buildForOllama(String userPrompt) {
        return """
            Genera un diagrama de clases UML como un único objeto JSON válido, sin Markdown ni explicaciones.

            ESQUEMA EXACTO:
            {
              "clases": [
                {
                  "id": "c1",
                  "nombre": "Cliente",
                  "estereotipo": "entity",
                  "posicionX": 100.0,
                  "posicionY": 100.0,
                  "atributos": [{"id":"a1","nombre":"id","tipo":"Long","visibilidad":"private"}],
                  "metodos": []
                },
                {
                  "id": "c2",
                  "nombre": "Pedido",
                  "estereotipo": "entity",
                  "posicionX": 400.0,
                  "posicionY": 100.0,
                  "atributos": [{"id":"a2","nombre":"id","tipo":"Long","visibilidad":"private"}],
                  "metodos": []
                }
              ],
              "relaciones": [{"id":"r1","origen":"c1","destino":"c2","tipo":"ASOCIACION","nombre":"pedidos","multiplicidadOrigen":"1","multiplicidadDestino":"0..*"}]
            }

            REGLAS:
            - Genera solo las clases de dominio solicitadas y al menos una clase. Cada clase incluye un atributo id de tipo Long.
            - Una relación UML va solo en relaciones, nunca como clase auxiliar. Una clase asociativa requiere un concepto real con atributos propios.
            - Si se piden Cliente y Pedido uno-a-muchos, genera exactamente esas dos clases y una ASOCIACION: origen Cliente 1, destino Pedido 0..*.
            - Todos los id son únicos; origen y destino usan id de clases existentes.
            - Tipos permitidos: Long, String, Integer, Double, Boolean, LocalDate. Visibilidades: public, private, protected.
            - Relaciones: ASOCIACION, AGREGACION, COMPOSICION, GENERALIZACION. Multiplicidades: 1, 0..1, 0..*, *.
            - clases, relaciones, atributos, metodos y parametros son arreglos, nunca null. Sin relaciones usa [].
            - posicionX y posicionY son números JSON obligatorios y distintos entre clases; nunca null, cadenas ni campos omitidos.
            - Si agregas métodos usa: {"id":"m1","nombre":"operacion","tipoRetorno":"String","visibilidad":"public","parametros":[{"nombre":"valor","tipo":"String"}]}.

            SOLICITUD:
            """ + userPrompt + """

            VERIFICACIÓN FINAL:
            - Si la solicitud enumera clases exactas, no agregues ninguna otra.
            - Uno-a-muchos siempre requiere un objeto en relaciones con multiplicidades 1 y 0..*, nunca una clase adicional.
            """;
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
