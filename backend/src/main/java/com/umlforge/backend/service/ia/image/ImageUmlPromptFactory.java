package com.umlforge.backend.service.ia.image;

public final class ImageUmlPromptFactory {

    private ImageUmlPromptFactory() {}

    public static String build() {
        return """
            Analiza la imagen de un diagrama UML de clases y reconstruye todo su contenido visible.

            REGLAS OBLIGATORIAS:
            - Devuelve unicamente un objeto JSON valido, sin Markdown, comentarios ni explicaciones.
            - Debe existir al menos una clase.
            - Transcribe literalmente los nombres visibles de clases, atributos, metodos y relaciones.
            - No inventes nombres, multiplicidades, roles, estereotipos ni operaciones.
            - Si el nombre de una clase o atributo no puede leerse, omite ese elemento.
            - Si la imagen muestra un tipo de atributo explicito y legible, conservalo exactamente como aparece
              y usa origenTipo "IMAGEN".
            - Si un atributo visible no muestra ningun tipo, sugiere uno razonable segun su nombre, la clase y
              el contexto del diagrama, usa origenTipo "SUGERIDO" y no afirmes que fue leido de la imagen.
            - Prefiere tipos de datos UML o del lenguaje sugerido por el propio diagrama. No deduzcas entidades,
              atributos ni relaciones adicionales para justificar un tipo.
            - Si parece existir un tipo pero no es legible, o no hay contexto suficiente para sugerirlo con
              confianza, usa tipo "", origenTipo "INDETERMINADO" y agrega una advertencia concreta.
            - Si una multiplicidad, rol, nombre de relacion o estereotipo no puede leerse,
              usa una cadena vacia y agrega una explicacion concreta en advertencias.
            - Si la visibilidad no aparece o no puede leerse, usa exactamente "unspecified".
            - Todos los ids deben ser cadenas unicas y no vacias en todo el modelo.
            - origen y destino deben usar ids de clases existentes, no sus nombres.
            - Las listas clases, atributos, metodos, parametros, relaciones y advertencias nunca pueden ser null.
            - Visibilidades permitidas: public, private, protected, unspecified.
            - Tipos de relacion permitidos: ASOCIACION, HERENCIA, AGREGACION, COMPOSICION, GENERALIZACION, DEPENDENCIA.
            - Distribuye las clases en posiciones distintas, conservando aproximadamente su disposicion en la imagen.

            MULTIPLICIDADES:
            - multiplicidadOrigen es el texto escrito junto al extremo de la clase indicada por origen.
            - multiplicidadDestino es el texto escrito junto al extremo de la clase indicada por destino.
            - No deduzcas multiplicidades por conocimiento del dominio. Si no son legibles, usa "" y agrega una advertencia.
            - Antes de responder, comprueba visualmente cada extremo por separado para evitar intercambiarlos.

            CLASES DE ASOCIACION:
            - Una clase unida mediante una linea discontinua al centro de una asociacion es una clase de asociacion.
            - Incluyela una sola vez en clases, con sus atributos y metodos visibles.
            - En la asociacion principal entre las dos clases extremas, establece claseAsociacion con el id de esa clase.
            - No crees una relacion directa adicional entre la clase de asociacion y uno de los extremos.
            - Si no es seguro que la linea sea discontinua o llegue a la asociacion, deja claseAsociacion en ""
              y agrega una advertencia.

            FORMATO EXACTO:
            {
              "advertencias": ["Descripcion concreta de texto o simbolo pendiente de revision"],
              "clases": [{
                "id": "clase-id-unico",
                "nombre": "NombreClase",
                "estereotipo": "",
                "posicionX": 100.0,
                "posicionY": 100.0,
                "atributos": [{
                  "id": "atributo-id-unico",
                  "nombre": "nombre",
                  "tipo": "TipoConservadoOSugerido",
                  "visibilidad": "unspecified",
                  "origenTipo": "IMAGEN|SUGERIDO|INDETERMINADO"
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
                "multiplicidadDestino": "0..*",
                "rolOrigen": "",
                "rolDestino": "",
                "claseAsociacion": "id-clase-asociacion-o-vacio"
              }]
            }
            """;
    }
}
