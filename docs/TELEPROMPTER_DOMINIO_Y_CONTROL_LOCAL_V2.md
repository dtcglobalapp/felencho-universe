# Felencho Mundial — dirección estable y control del Teleprompter (propuesta 2026-11-18)

## Decisión
- Dirección deseada para operador: `https://felencho.ai/teleprompter` (no publicada todavía).
- **No redirigir una web HTTPS a `http://192.168.x.x:3107`**, porque IP cambia entre redes y HTTPS->HTTP puede ser bloqueado por navegador, además de no proteger guiones.
- No subir guiones privados ni claves a una página pública.
- La Bestia sigue siendo el único cerebro y servidor local (3107); iPad Safari cliente de lectura; BestView únicamente desplaza manualmente; Studio Control local (7892) administra el servicio.
- La URL pública requiere verificar dominio, proyecto y autenticación, que no pudieron comprobarse con las credenciales disponibles (Vercel 403). No desplegar ni publicar por defecto.

## Arquitecturas a decidir y validar
A. **Solo local, preferida ahora:** `http://la-bestia.local:3107/teleprompter-lab` por Bonjour en misma Wi-Fi. El nombre de host es estable frente a DHCP, pero la sesión requiere conexión local y un control de acceso cifrado antes de guiones confidenciales. Los dispositivos Bonjour y la configuración de firewall deben comprobarse.
B. **URL pública autenticada:** `https://felencho.ai/teleprompter` como frontend web con HTTPS, identidad/autorización y un canal de conexión seguro hacia La Bestia iniciado desde dentro de la red (por ejemplo, túnel con acceso restringido) o replicación de guiones aprobados al backend con consentimiento. Nunca abrir puertos 3107, 7892, 3002, 7880 o TTS directamente a internet.
C. **Dominio propio resuelto solo en red estudio:** configurar DNS local `teleprompter.felencho.ai` y certificados HTTPS válidos, requiere router/DNS y certificado, no se obtiene simplemente añadiendo una ruta `/teleprompter` al dominio público.

## Trabajo siguiente en La Bestia sin tablet
1. Inspeccionar el dueño real del puerto 3107, evitar ejecutar dos controladores de arranque (LaunchAgent/Terminal/Studio Control).
2. Inspeccionar código **local** real del panel Studio Control en 7892; no asumir que su código está en el repositorio web.
3. Agregar controles de Start/Stop/Open/Health al panel mediante el gestor existente, restringidos al PID/cwd de Teleprompter Lab. No usar `pkill node` ni reiniciar el estudio.
4. Crear canal autenticado de controles `fontSize` / `mirror` desde La Bestia a Safari; cambios en vivo sin resetear scroll.
5. Comprobar restauración de guion y `scrollTop` en Chrome; luego Safari físico en estudio.
6. Preparar recepción solo de guion aprobado tras orden de voz previa al programa. El comando no debe autorizar diálogo de Bob/Lina ni iniciar lectura.
7. Validar con pruebas y rollback en rama antes de cambios a producción.

## Precauciones
- V2 de GitHub implementa localStorage del guion y posición; no confirmado aún en iPad. Sin fuente de datos externa, Safari podría borrar la copia.
- La API de lectura heredada se apoya en tablas con nombres de compatibilidad; no renombrar la base de datos sin migración.
- El servicio local usa HTTP: NO introducir contenido confidencial en esta fase.
- El hecho de que un sitio tenga HTTPS no asegura que un servidor en La Bestia resulte accesible desde fuera.
