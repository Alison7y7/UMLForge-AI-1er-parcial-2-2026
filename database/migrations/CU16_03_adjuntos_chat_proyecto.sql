-- CU16 etapa 5. Adjuntos privados y persistentes del chat por proyecto.
-- Migracion aditiva: no elimina ni reescribe mensajes o diagramas existentes.

CREATE TABLE IF NOT EXISTS public.adjunto_chat_proyecto (
    id character varying(36) PRIMARY KEY,
    proyecto_id bigint NOT NULL,
    mensaje_id bigint NOT NULL,
    nombre_original character varying(255) NOT NULL,
    storage_key character varying(255) NOT NULL UNIQUE,
    mime_type character varying(120) NOT NULL,
    tamano_bytes bigint NOT NULL,
    categoria character varying(16) NOT NULL,
    sha256 character varying(64) NOT NULL,
    fecha_creacion timestamp(6) without time zone NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT fk_adjunto_chat_proyecto FOREIGN KEY (proyecto_id) REFERENCES public.proyecto(id),
    CONSTRAINT fk_adjunto_chat_mensaje FOREIGN KEY (mensaje_id) REFERENCES public.mensaje_chat_proyecto(id),
    CONSTRAINT ck_adjunto_chat_categoria CHECK (categoria IN ('AUDIO', 'IMAGEN', 'DOCUMENTO', 'DATOS')),
    CONSTRAINT ck_adjunto_chat_tamano CHECK (tamano_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_adjunto_chat_mensaje ON public.adjunto_chat_proyecto (mensaje_id);
CREATE INDEX IF NOT EXISTS idx_adjunto_chat_proyecto ON public.adjunto_chat_proyecto (proyecto_id);
