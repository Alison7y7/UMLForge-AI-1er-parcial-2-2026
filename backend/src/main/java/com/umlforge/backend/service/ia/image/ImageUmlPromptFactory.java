package com.umlforge.backend.service.ia.image;

public final class ImageUmlPromptFactory {

    private ImageUmlPromptFactory() {}

    public static String build() {
        return """
            Analiza la imagen de un diagrama UML de clases y reconstruye todo su contenido visible.

            REGLAS OBLIGATORIAS:
            - Devuelve unicamente un objeto JSON valido, sin Markdown, comentarios ni explicaciones.
            - Debe existir al menos una clase.
            - Transcribe clases, atributos, metodos, relaciones y multiplicidades visibles.
            - Si un texto no es completamente legible, infiere el valor mas probable sin inventar clases ajenas al diagrama.
            - Todos los ids deben ser cadenas unicas y no vacias en todo el modelo.
            - origen y destino deben usar ids de clases existentes, no sus nombres.
            - Las listas clases, atributos, metodos, parametros y relaciones nunca pueden ser null.
            - Visibilidades permitidas: public, private, protected.
            - Tipos de relacion permitidos: ASOCIACION, HERENCIA, AGREGACION, COMPOSICION, GENERALIZACION, DEPENDENCIA.
            - Distribuye las clases en posiciones distintas, conservando aproximadamente su disposicion en la imagen.

            FORMATO EXACTO:
            {
              "clases": [{
                "id": "clase-id-unico",
                "nombre": "NombreClase",
                "estereotipo": "entity",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [{
                  "id": "atributo-id-unico",
                  "nombre": "nombre",
                  "tipo": "String",
                  "visibilidad": "private"
                }],
                "metodos": [{
                  "id": "metodo-id-unico",
                  "nombre": "operacion",
                  "tipoRetorno": "void",
                  "visibilidad": "public",
                  "parametros": [{"nombre": "valor", "tipo": "String"}]
                }]
              }],
              "relaciones": [{
                "id": "relacion-id-unico",
                "origen": "clase-id-origen",
                "destino": "clase-id-destino",
                "tipo": "ASOCIACION",
                "nombre": "nombreRelacion",
                "multiplicidadOrigen": "1",
                "multiplicidadDestino": "0..*"
              }]
            }
            """;
    }
}
