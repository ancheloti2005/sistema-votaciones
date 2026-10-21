# Sistema de Votación Web — Municipio Escolar
### I.E. N.° 88017 "César Vallejo" — Nuevo Chimbote

Sistema web desarrollado para automatizar las elecciones del Municipio Escolar de la I.E. César Vallejo en los niveles primaria y secundaria. Reemplaza la votación manual, eliminando los errores en el conteo de votos y reduciendo el tiempo del proceso electoral.

## Problema

Las elecciones del Municipio Escolar se realizaban de forma manual, lo que generaba errores en el conteo de votos, demoras en la entrega de resultados y dificultad para controlar que cada estudiante votara una sola vez.

## Solución

Una plataforma web donde cada estudiante ingresa con su DNI o su código de estudiante, vota por su candidato desde una cédula digital y su voto se cuenta automáticamente. El comité electoral obtiene los resultados en tiempo real y el acta en PDF al finalizar.

## Funcionalidades

**Para los estudiantes**
- Ingreso por nivel educativo (primaria o secundaria) con DNI o código de estudiante.
- Cédula digital con foto, cargo y logo de cada candidato.
- Consulta pública de los postulantes de cada nivel.
- Cuenta regresiva en la portada hasta el inicio de la votación.

**Para el comité electoral (panel administrativo)**
- Resultados en tiempo real con gráfico de barras y participación por nivel.
- Programación de la votación por fecha y hora, con opción de cierre anticipado.
- Descarga del acta de resultados en PDF.
- Carga del registro de estudiantes desde el Excel del colegio.
- Gestión de candidatos: agregar, editar o quitar, con foto y logo.
- Edición de la portada: imagen de fondo y título.
- Lista de estudiantes que no votaron.
- Limpieza de votos y cambio de contraseña.

## Seguridad

- **Un voto por estudiante:** lo garantiza la base de datos, incluso si se intenta votar desde dos equipos a la vez.
- **Voto secreto:** el sistema registra quién votó, pero nunca por quién votó cada estudiante.
- **Acceso restringido:** solo los administradores registrados pueden ver resultados y modificar datos.
- **Horario controlado:** nadie puede votar fuera del horario programado.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | HTML5, CSS3, JavaScript |
| Base de datos y autenticación | Supabase (PostgreSQL) |
| Almacenamiento de imágenes | Supabase Storage |
| Publicación | Netlify |
| Control de versiones | Git y GitHub |
| Librerías | SheetJS (lectura de Excel), jsPDF (generación del acta) |

## Estructura del proyecto

index.html Portada
postulantes.html Lista de postulantes por nivel
ingreso.html Ingreso del estudiante
vault.html Cédula de votación
admin.html Acceso del administrador
panel.html Resultados y control de la votación
estudiantes.html Registro de estudiantes
candidatos.html Gestión de candidatos
portada.html Edición de la portada
contrasena.html Cambio de contraseña
css/ Estilos
js/ Lógica del sistema
images/ Imágenes del colegio y de los candidatos

## Uso el día de la elección

1. Cargar el registro de estudiantes de primaria y secundaria.
2. Registrar a los candidatos con su foto y logo.
3. Programar el día y la hora de la votación.
4. Al finalizar, descargar el acta de resultados en PDF.

## Privacidad

El registro de estudiantes contiene datos de menores de edad. Los archivos Excel con datos reales no se suben a este repositorio; se cargan únicamente desde el panel administrativo.

## Autor

**Ronaldo Mamani**
Estudiante de Ingeniería de Sistemas — Universidad Nacional del Santa
Proyecto desarrollado como producto final de las prácticas pre-profesionales en la I.E. César Vallejo, Nuevo Chimbote, 2026.