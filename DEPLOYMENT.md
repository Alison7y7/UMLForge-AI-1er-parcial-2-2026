# Despliegue de UMLForge-AI con Docker Compose

## Requisitos

- Docker Engine y Docker Compose v2.
- Al menos 16 GB de RAM para ejecutar `gemma3:4b` por CPU junto con el resto de servicios.
- 30 GB de almacenamiento persistente como punto de partida.
- Para GPU NVIDIA: drivers NVIDIA y NVIDIA Container Toolkit.

## Configuracion

1. Copiar `.env.example` a `.env`.
2. Definir una contrasena fuerte para PostgreSQL.
3. Generar un secreto JWT aleatorio de al menos 32 bytes.
4. Agregar `GEMINI_API_KEY` si se desea habilitar el segundo proveedor remoto.

El archivo `.env` no debe versionarse ni copiarse dentro de las imagenes.

## Construccion y arranque por CPU

```bash
docker compose build
docker compose up -d
```

## Arranque con GPU NVIDIA

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

## Descargar modelos de Ollama

Los modelos no se descargan durante el build. Una vez iniciado Ollama:

```bash
docker compose exec ollama ollama pull qwen2.5:1.5b
docker compose exec ollama ollama pull gemma3:4b
docker compose exec ollama ollama list
```

El volumen `ollama_data` conserva los modelos entre reinicios. El volumen
`postgres_data` conserva la base de datos.

## Verificaciones

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 ollama
curl http://localhost/
curl http://localhost/api/auth/me
docker compose exec postgres pg_isready -U "$DB_USER" -d "$DB_NAME"
docker compose exec ollama ollama list
```

Una respuesta 401 o 403 en `/api/auth/me` sin JWT confirma que Nginx alcanza al
backend y que Spring Security protege el endpoint. El login y el WebSocket deben
probarse desde la interfaz con un usuario valido.

## Detencion

```bash
docker compose down
```

No usar `docker compose down -v` en produccion: elimina los volumenes persistentes.

## AWS EC2

1. Crear una instancia Linux con Docker y Docker Compose.
2. Adjuntar un volumen EBS con espacio suficiente para PostgreSQL y los modelos.
3. Copiar el repositorio y crear el `.env` solo en el servidor.
4. Abrir inicialmente solo el puerto HTTP configurado por `HTTP_PORT`.
5. Construir, iniciar los servicios y descargar los modelos con los comandos anteriores.
6. En una instancia NVIDIA, instalar NVIDIA Container Toolkit y usar el archivo
   `docker-compose.gpu.yml`.

El dominio, TLS/HTTPS, balanceador y certificados quedan fuera de esta preparacion.
