# Felencho Mundial — prueba de aceptación en estudio (rama de desarrollo)

## Confirmado
- Vercel: commit b298bc96 READY (compilación de preview).
- Supabase: transacción SQL de registro ficticio devuelve status pending_review y consentimiento de memoria verdadero; ROLLBACK deja cero registros.
- La función getApprovedGuestBriefing exige status=approved y consent_ai_memory=true, y omite correo y teléfono.
- Bob y Lina tienen instrucciones para escribir F-E-L-E-N-C-H-O y no repetir presentaciones innecesarias.
- El cerebro dispone de web_search para consultas identificadas como actuales, incluidas preguntas de clima y hora mundial.

## No verificado todavía
- Carga de foto real a Storage mediante la API y validación de que se asocia al registro.
- Rechazo de reutilización de token mediante petición HTTP de extremo a extremo.
- Pruebas de clima, noticias y hora mundial con respuestas reales y fuentes.
- Selección de invitado aprobado desde la interfaz de estudio: DuoStudio no envía studioGuestId al despacho actualmente.
- Despliegue del agente LiveKit de esta rama y conversación con ambos avatares: no desplegar en producción sin autorización.

## Seguridad pendiente antes de uso real
- No habilitar endpoint de invitación con secreto en navegador; crear panel autenticado de administración y correo de invitación.
- Verificar identidad del invitado y autorización antes de usar una foto; controlar reintentos y archivos huérfanos.
- Evitar exponer detalles de LiveKit en respuestas públicas; asegurar que dispatch esté ligado a sesión autenticada del anfitrión.
- Confirmar las variables STUDIO_GUEST_CONTEXT_SECRET y STUDIO_INVITATION_ADMIN_SECRET en el entorno de prueba sin exponer sus valores.
