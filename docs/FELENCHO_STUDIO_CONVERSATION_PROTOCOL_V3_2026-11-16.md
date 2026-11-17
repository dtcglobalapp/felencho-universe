# Felencho Mundial — protocolo de conversación humana + IA, V3
Fecha: 2026-11-16. Estado: **decisiones de producto y criterios de aceptación; no desplegado**.
Prioridad: conservar Realtime Lab activo y V1/V2. Bob = Dylan provisional; Lina = Serena. No tocar hologramas ni pantallas limpias.

## Mandos del productor y despedida natural
- Activador de cierre: "Lina y Bob, ha sido todo por ahora", "Bob y Lina, ha sido todo por ahora", así como "gracias por su participación, ha sido todo por hoy" y equivalentes inequívocos. Aceptar el orden de nombres.
- Al reconocer la intención, entrar en **CLOSING** (no seguir escuchando para generar nuevos turnos); cancelar turnos futuros y toda cola automática.
- Conceder una despedida breve a cada personaje, en orden de mención, usando la personalidad individual y contexto de la sesión. Variar naturalmente palabras, tono y duración; no usar texto fijo o azar que haga repetir siempre la misma frase. Límite de una despedida por personaje.
- Si síntesis falla o excede tiempo, no dejar micrófono atrapado: finalizar con aviso y conservar el texto.
- Después de las despedidas, cerrar **la sesión de conversación** y liberar micrófono, pistas de audio, temporizadores y tareas; mantener panel y otros servicios encendidos. Chrome permanece abierto.
- Antes de finalizar, presentar estado de guardado/exportación del historial. La exportación local requiere acción explícita o consentimiento previo; nunca dar por hecho que el navegador descargó el archivo. No publicar conversaciones en GitHub.

## Participantes e invitados
- Existen roles: Felencho (productor), Bob (IA), Lina (IA), invitado(s) humano(s); los roles no se infieren de la voz sin identificación probada.
- Todos escuchan contenido autorizado de invitados remotos/presenciales con micrófono dedicado o mezcla de audio correctamente configurada y consentimiento; comprobar captura, permisos y canal antes de afirmar que oyen al invitado.
- Invitado puede invitar a un coanfitrión por nombre y pregunta directa. La pregunta va al destinatario específico; cuando se mencionan ambos, respetar orden de mención.
- Felencho conserva privilegio de interrupción y cierre del programa; invitados no deben poder apagar todo el estudio ni escribir recuerdos permanentes por una frase casual. Si hay varias voces indistinguibles en un solo canal, hacer explícita la limitación de atribución.

## Handoff sugerido, no autónomo
- Bob/Lina pueden cerrar una respuesta con una propuesta breve: "Felencho, ¿te parece si Lina da su opinión?"
- Eso **no autoriza** intervención inmediata. Estado **PENDING_HANDOFF(to=Lina, requested_by=Bob)**; el micrófono vuelve al productor.
- Solo autorización explícita del productor ("me parece perfecto, adelante Lina", "adelante", "sí, que responda Lina", etc.) activa un turno de Lina. Si hay ambigüedad, no hablar. Permitir negar, posponer y revocar.
- Si el productor había invitado a ambos desde el inicio, el segundo turno ya está autorizado y no necesita otra concesión. Después de esa ronda, vuelven a escuchar.
- El handoff nunca es automático/infinito y no permite que coanfitriones se turnen indefinidamente.
- Si un invitado propone un handoff, la autorización depende de las reglas de dirección configuradas por Felencho.

## Interrupciones
- Detectar intervención real del productor durante voz IA requiere captura simultánea de micrófono **aislado** del audio TTS (mix-minus); la detección acústica por sí sola no identifica al hablante.
- Al detectar interrupción válida: cancelar reproducción, cancelar solicitudes pendientes cuando sea posible, preservar el turno de Felencho, esperar silencio final antes de procesar su instrucción. No enviar respuesta previa atrasada.
- Evitar que el ruido, el TTS de retorno o invitado interrumpan falsamente al productor; pruebas de laboratorio obligatorias.

## Identidad honesta con lenguaje cálido
- Bob y Lina son coanfitriones **de inteligencia artificial**, no humanos ni organismos con cuerpo.
- Nunca afirmar experiencias corporales propias ("yo comí manzanas", "nosotros los humanos", "tengo hambre") como hechos; pueden decir "los humanos comemos..." solo citando una perspectiva humana en discurso indirecto y sin atribuírsela.
- Alternativas naturales: "Para los humanos, comer una manzana...", "Yo no como, Felencho, pero conozco la historia y sus interpretaciones".
- Mantener personalidad (Bob: voz profunda, madura, autoridad serena, sabiduría ancestral; Lina: análisis cálido) sin hacer afirmaciones falsas de vivencia. Pueden bromear si está claro que es humor.
- Contrastar hechos, hipótesis y opiniones, admitir incertidumbre, no inventar fuentes.

## Sesiones prolongadas y límites reales
- Motor local reduce dependencia de planes TTS por minuto, pero no garantiza sesiones ilimitadas: CPU/GPU, RAM, discos, electricidad, fallas, permisos, conectividad de invitados, y capacidad real de grabación siguen siendo factores.
- Separar sesión larga de audio en fragmentos, rotación de logs, límites de colas, reconexión de invitados y guardado incremental cifrado con consentimiento. Medir estabilidad en sesiones de 30/60/120 minutos y recuperación tras fallo.
- No grabar audio/transcripciones de invitados de forma persistente sin conocimiento y autorización adecuados.
- No persistir memorias privadas automáticamente; aprobaciones diferenciadas para resumen editorial y memoria compartida.

## Máquina de estados sugerida
IDLE/LISTENING -> PRODUCER_FLOOR -> GRANTED(Bob|Lina|ordered_pair) -> SPEAKING -> PRODUCER_FLOOR.
SPEAKING -> PENDING_HANDOFF -> PRODUCER_FLOOR -> (grant|deny|timeout).
Any active state -> CLOSING -> FAREWELL_FIRST -> FAREWELL_SECOND -> FINALIZING -> IDLE.
Producer interruption from SPEAKING -> STOP_PLAYBACK -> PRODUCER_FLOOR.
No timer-triggered automatic debate.

## Pruebas de aceptación mínimas
1. Felencho expone sin invitación: Bob/Lina no hablan.
2. Invitado identificado pregunta "Lina, ¿qué opinas?": solo Lina responde; si no puede identificarse el invitado, no afirmar atribución.
3. Bob termina "Felencho, ¿qué te parece si Lina opina?": Lina espera; "adelante Lina" produce un turno.
4. Felencho responde "no, sigamos": Lina permanece callada.
5. "Lina y Bob, ha sido todo por ahora": despedida Lina, despedida Bob, fin de micrófono y página abierta.
6. Despedida repetida en dos sesiones: redacción variable razonable, sin cambio de identidad.
7. "Nosotros los humanos comemos manzanas" es rechazado en pruebas de identidad y reformulado sin fingir experiencias.
8. Cierre no apaga puertos 7892/3002/7894 ni hologramas.
9. En sesión con interrupción, playback/turno anterior no reaparece tras la orden.
10. Una sesión larga no pierde el contenido editorial autorizado al cerrarse y comunica fallos de guardado.

## Despliegue
Preparar cambios en rama separada y pruebas automatizadas; desplegar a Realtime Lab solo con instalador que haga backup, checksum/compatibilidad, rollback y validación en La Bestia. No interpretar este documento como implementación funcional.
