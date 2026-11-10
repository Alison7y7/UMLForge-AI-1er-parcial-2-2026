# Manual de usuario de UMLForge AI

Este manual explica las funciones disponibles en la versión actual de UMLForge AI, los permisos que pueden limitar cada acción y las rutas reales para encontrarlas. Complementa la ayuda integrada de la aplicación y desarrolla el mecanismo de aprendizaje definido en la sección 8 del documento oficial del segundo parcial.

## 1. Acceso y cuenta

### Iniciar sesión

1. Abre `/login`.
2. Completa **Correo electrónico** y **Contraseña**.
3. Pulsa **Iniciar sesión**.
4. Si las credenciales son válidas, la aplicación abre **Panel** con las opciones de tu rol.

Desde esa pantalla también puedes instalar la PWA cuando el navegador lo permita.

### Registrar una cuenta

1. En **Inicia sesión**, pulsa **Regístrate**.
2. Completa nombre, apellido, correo, contraseña y confirmación.
3. Selecciona uno de los roles iniciales que el formulario permita.
4. Pulsa **Crear cuenta** y luego inicia sesión.

### Recuperar la contraseña

La versión actual no incluye un botón **Olvidé mi contraseña** ni un flujo automático de recuperación. No se debe compartir, inventar o mostrar una contraseña. Solicita al administrador responsable el procedimiento autorizado.

## 2. Proyectos, participantes y roles

### Crear y abrir un proyecto

1. Abre **Proyectos** desde la navegación.
2. Para crear, pulsa **Nuevo proyecto**, completa nombre y descripción y pulsa **Guardar**.
3. Para continuar uno existente, pulsa **Abrir proyecto**.

La creación y administración solo aparecen cuando los permisos del usuario lo permiten.

### Trabajar con diagramas

Dentro de un proyecto, la pestaña **Diagramas UML** permite crear un **Nuevo diagrama**, abrirlo, renombrarlo o cambiar su estado según los permisos. **Ver diagrama UML** abre la vista segura; **Abrir diagrama** entra al editor.

### Invitar a otra persona

1. Abre **Equipo del proyecto**.
2. Pulsa **Invitar persona**.
3. Escribe el correo de una cuenta registrada.
4. Revisa **Acceso** y **Confirmar**.
5. Pulsa **Enviar invitación**.

La invitación queda pendiente hasta que la persona la acepte. El anfitrión o un administrador autorizado gestiona las invitaciones; un colaborador no obtiene ese permiso por consultar la ayuda.

### Roles

- **Administrador:** accede a funciones globales habilitadas por sus permisos, como usuarios, roles o bitácora.
- **Anfitrión:** crea y administra sus proyectos, diagramas e invitaciones.
- **Colaborador:** trabaja en los proyectos a los que fue incorporado.

La interfaz y el backend validan cada operación. El nombre del rol por sí solo no sustituye los permisos efectivos.

## 3. Editor UML

### Crear una clase

1. Abre un diagrama y activa **Modo Edición** si aparece en visualización.
2. Selecciona **Clase**.
3. Toca o haz clic en el lienzo.
4. Selecciona la clase y abre **Inspector**.
5. Cambia nombre y estereotipo.

### Agregar atributos y métodos

En **Inspector**, la sección **Atributos** permite definir nombre, tipo y visibilidad. La sección **Métodos** permite definir nombre, retorno, visibilidad y parámetros. Los botones de eliminación actúan sobre el elemento seleccionado.

### Crear relaciones y multiplicidades

1. Elige **Asociación**, **Agregación**, **Composición**, **Generalización** o **Dependencia**.
2. Selecciona la clase origen.
3. Selecciona la clase destino.
4. En **Inspector**, revisa **Tipo de Relación**, **Mult. Origen**, **Mult. Destino** y los roles.

Las multiplicidades aceptan expresiones UML como `1`, `0..1`, `*` y `0..*`.

### Organizar y guardar

Arrastra las clases para organizarlas manualmente. **Centrar vista** y **Ajustar a pantalla** recuperan el encuadre, pero no existe autoorganización del modelo. Pulsa **Guardar** y espera la confirmación antes de cerrar o navegar.

## 4. Colaboración e inteligencia artificial

### Tiempo real

Los participantes autorizados reciben presencia y cambios confirmados del proyecto. **Equipo** muestra **Conectados ahora**. PostgreSQL y la versión persistida del diagrama siguen siendo la fuente de verdad.

### Chat compartido

Abre **Chat del proyecto** desde el proyecto o **Chat** desde el editor. Los mensajes pertenecen al proyecto actual y se conservan para sesiones posteriores.

### Revisión y recomendaciones

1. Abre Chat y selecciona el diagrama correcto.
2. Solicita una revisión UML.
3. Lee la justificación, el impacto y el estado de cada recomendación.
4. Usa **Aplicar**, **Descartar**, **Aplicar compatibles** o **Revalidar** cuando aparezcan.
5. Si existen alternativas, elige o descarta una de ellas.

Una recomendación no modifica el UML hasta que un usuario autorizado la aplica y el servidor la valida contra la versión actual. Las eliminaciones requieren confirmación.

## 5. Historial y continuidad

### Historial y actividad

En el proyecto abre **Historial y actividad**. Puedes buscar y filtrar por tipo, participante, diagrama y fechas. La vista usa paginación; un proyecto legítimamente vacío muestra **Todavía no hay actividad registrada**.

### Conversaciones anteriores

Abre **Chat del proyecto**. La conversación reciente se recupera desde el backend y, cuando corresponde, puedes cargar mensajes anteriores. El historial completo añade decisiones y cambios UML relacionados.

### Continuar donde lo dejamos

La tarjeta muestra el último diagrama, versión, última actividad, cambios confirmados y recomendaciones pendientes. **Abrir último diagrama** recupera el modelo guardado; **Ver historial** amplía el contexto. Abrir el proyecto no ejecuta solicitudes generativas ni consume cuota de IA.

## 6. Importación, exportación y generación

### Importar XMI

1. En el editor abre **Herramientas y opciones**.
2. Pulsa **Importar XMI** y selecciona el archivo.
3. Pulsa **Analizar XMI**.
4. Revisa clases, atributos, métodos y relaciones.
5. Pulsa **Importar al diagrama** y luego **Guardar**.

### Exportar XMI

1. Guarda y revisa el diagrama.
2. En **Herramientas y opciones**, pulsa **Exportar XMI**.
3. Revisa el resumen.
4. Pulsa **Descargar XMI**.

El archivo se genera en XMI 2.1. Un diagrama vacío no se puede exportar.

### Generar backend

En **Herramientas y opciones**, pulsa **Generar Backend Spring**, revisa las clases y relaciones, completa la configuración PostgreSQL y confirma **Generar ZIP**.

## 7. Móvil y notificaciones

### Consultar desde el celular

Inicia sesión desde un navegador compatible o instala la PWA. Abre **Proyectos**, selecciona uno y usa **Ver diagrama UML**. En móvil el editor empieza en visualización segura; activa **Modo Edición** solo si es necesario y tu rol lo permite.

### Activar notificaciones

1. Abre **Notificaciones**.
2. Pulsa **Activar notificaciones** y concede el permiso del navegador.
3. Elige los eventos y guarda las preferencias.
4. Usa **Enviar prueba**.

Web Push requiere HTTPS, salvo `localhost`. En iOS compatible, instala la PWA en la pantalla de inicio y ábrela desde allí.

## 8. Ayuda integrada

El botón **¿Necesitas ayuda?** abre un único agente de ayuda con dos modos:

- **Preguntar:** interpreta sinónimos frecuentes y conserva los últimos turnos de la conversación local de ayuda.
- **Manual y tutorial:** permite buscar y navegar los temas de este manual con pasos y enlaces internos.

La respuesta identifica la documentación local como fuente. La ayuda no llama al flujo generativo, no consulta datos privados y no crea, elimina o modifica UML. Para cambios usa el Chat del proyecto y su flujo de aprobación.

## 9. Preguntas frecuentes

### La ayuda no reconoce mi pregunta

Usa el nombre visible de la pantalla, botón o concepto, por ejemplo **Exportar XMI**, **Invitar persona** o **Historial y actividad**. Si no existe una coincidencia, abre **Manual y tutorial**; la aplicación no debe responder con un tema solo por la pantalla actual.

### No veo una acción descrita

Comprueba tu rol, los permisos efectivos y que estés en el proyecto correcto. La ayuda explica la función, pero no eleva permisos.

### ¿La ayuda puede modificar el diagrama?

No. Es de solo lectura. Los cambios asistidos se solicitan en Chat, se muestran como recomendaciones y requieren una decisión explícita.

### ¿Por qué Push no funciona por una IP HTTP?

Porque los navegadores exigen un contexto seguro. Usa HTTPS o `localhost` para desarrollo.

## 10. Evidencias pendientes

- `[Captura pendiente: pantalla Inicia sesión y enlace Regístrate]`
- `[Captura pendiente: Proyectos con Nuevo proyecto y Abrir proyecto]`
- `[Captura pendiente: Equipo del proyecto e Invitar persona]`
- `[Captura pendiente: editor con Clase, relaciones, Inspector y Guardar]`
- `[Captura pendiente: Chat con recomendación y acciones Aplicar/Descartar]`
- `[Captura pendiente: Historial y actividad con filtros]`
- `[Captura pendiente: modales Importar XMI y Exportar XMI]`
- `[Captura pendiente: Notificaciones y Enviar prueba bajo HTTPS]`
- `[Captura pendiente: ayuda integrada en Preguntar y Manual y tutorial]`

