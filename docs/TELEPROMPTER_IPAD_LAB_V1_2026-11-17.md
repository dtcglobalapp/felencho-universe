# Teleprompter iPad — ensayo aislado V1 (17 nov 2026)

Rama: `feature/ipad-teleprompter-lab-v1`
Estado: **código en GitHub, no instalado ni comprobado en La Bestia**.
No modifica Studio Control 7892, Realtime Lab 3002, Qwen-TTS 7894, LiveKit 7880, ni los hologramas.

## Entregado
- `/teleprompter-lab`: texto grande, modo espejo, play/pause, velocidad, tamaño, editor de prueba, caché local del último guion.
- `/api/teleprompter-lab/script?script_id=...`: fuente **solo lectura** desde `lumina_scripts`, `lumina_script_scenes`, `lumina_scene_lines`; reconoce `Felencho Virtual` como texto del presentador, no como tercer cohost. **Nunca expone diálogos de Bob/Lina** al iPad.
- Modo de sincronización opcional: el usuario introduce ID del guion y token de laboratorio; sincroniza cada 8 s mientras esté habilitado, conserva la última copia cuando falle la red.

## Seguridad / conexión
- El endpoint está cerrado por defecto: necesita variable de servidor `FELENCHO_TELEPROMPTER_TOKEN` de al menos 24 caracteres aleatorios, además de las credenciales Supabase que ya use la aplicación. No escribir claves en el código ni en commits.
- Token se mantiene en memoria de la pestaña; el navegador guarda **solo** el texto y las opciones de visualización en localStorage (guiones sensibles: considerar cifrado y política de eliminación antes de producción).
- Esta clave compartida es un mecanismo **de laboratorio**, no autenticación multiusuario. **No publicar** la página en dominio público ni exponer el servidor a internet. En HTTP sobre Wi-Fi el token viaja sin cifrado: para el uso de guiones reales en el iPad será necesaria una entrega HTTPS de confianza o autenticación local más robusta.
- Nunca enviar la `SUPABASE_SERVICE_ROLE_KEY` al cliente.
- Antes de permitir al iPad llegar a la app local, confirmar que la app Next.js de **la rama de prueba** puede escucharse en interfaz LAN; evitar modificar el proceso actual que ocupa 3002. Usar puerto separado solo para un laboratorio aislado si hay capacidad y medidas de acceso.
- `127.0.0.1` en el iPad apunta al iPad. Usar nombre Bonjour o IP local del estudio cuando se valide conexión.
- Probar mando BestView físicamente; las flechas y Espacio del teclado están implementadas, no hay compatibilidad del mando confirmada.

## Hallazgo importante
La API heredada `lumina_producer/next` lee `lumina_script_lines`, pero `generate-lines` escribe `lumina_scene_lines`. La nueva API de teleprompter lee la tabla generada actual y **no** modifica la API antigua. Antes de sincronizar avance por línea con el Director, reconciliar esos esquemas y corregir el `script_id` fijo de `ProducerPanel.tsx`.

## Criterios para fase siguiente
1. Build TS/Next.js en un clon aislado (aún no ejecutado).
2. Guion real en fuente correcta, sin Bob/Lina expuestos; verificar que la línea `Felencho Virtual` corresponda a la voz humana antes de producción.
3. Protección del endpoint y acceso local iPad con HTTPS o control de acceso acordado.
4. Control BestView, modo espejo y prueba de corte de Wi-Fi.
5. Sin cambios a servidores de audio. Mantener rollback descartando la rama.

