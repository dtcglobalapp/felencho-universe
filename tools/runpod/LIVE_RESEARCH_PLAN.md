# Felencho Mundial — Motor de investigación en vivo (plan aislado)

**Objetivo editorial:** Bob y Lina comparten una mesa de investigación que consulta Internet, fuentes oficiales, catálogos de bibliotecas, bibliografía académica, hemerotecas y documentos internos expresamente autorizados, para responder a preguntas durante la emisión. La investigación **no sustituye la evidencia ni elimina las incertidumbres**.

## Situación comprobada (4 noviembre 2026)
- `lib/felenchoBrainEngine.ts` ya recupera memorias y entidades de tablas Supabase `felencho_memories` y `felencho_knowledge_entities` y consulta información visual reciente. No es un buscador general de noticias de Internet.
- La ruta actual `app/api/felencho-forever/conversation/route.ts` ya invoca `askFelenchoBrain` y opcionalmente audio; se mantiene intacta. `agents/lina/src/main.ts` usa un agente de voz LiveKit en producción experimental; **no modificarlo**.
- `tools/runpod/research_evidence_offline.py` define una ficha de fuente con título, URL HTTPS, fecha de obtención, fecha de publicación (cuando exista), categoría y grado de verificación. No hace peticiones ni genera respuestas.
- `tools/runpod/research_public_catalogs_experimental.py` implementa dos conectores de descubrimiento bibliográfico **solo cuando se invoca explícitamente `run_live`**: Open Library (libros) y Crossref (metadatos académicos). Peticiones limitadas a dominios predefinidos, plazo de 4 s, 90 KB máximo, 3 resultados por proveedor, sin redirecciones. Sin acceso a bibliotecas privadas; no ejecutado sobre red real todavía.
- Los resultados de catálogo no son automáticamente pruebas de contenido, disponibilidad del libro, ni noticias del día. `verified=False` indica metadatos no corroborados.
- Todos los archivos nuevos están en la rama experimental; no forman parte de la ejecución de Bob/Lina.

## Ruta hacia las respuestas de actualidad
1. **Pregunta del presentador:** el coordinador identifica actor, tema, si requiere actualidad y si se permite buscar. En caso de interrupción, se cancela la respuesta en curso y se conserva un checkpoint sin repetir texto anterior.
2. **Planificador:** decide entre memoria de Felencho Brain, consultas a medios/fuentes oficiales, libros/archivo, artículos académicos o documentos privados conectados con permiso específico.
3. **Buscador web autorizado:** integrar proveedor de búsqueda con licencia/API para Internet general y noticias. Implementar en un servidor seguro con claves en secret manager, límites de coste, timeouts, resultados breves y caché corta. **No hay actualmente proveedor general conectado ni búsqueda web real para Bob/Lina**.
4. **Verificación:** abrir fuentes primarias cuando sea necesario, contrastar varias fuentes, comprobar fecha de publicación y del evento, distinguir rumor, opinión, hipótesis, evidencia y respuesta oficial. Evitar frases que aparenten verificación cuando solo existe un titular.
5. **Respuesta en vivo:** dar una respuesta breve, atribuir procedencia («según el DOT de NYC»), marcar dudas y almacenar enlaces visibles en Panel de Control; el presentador puede pedir «muéstrame las fuentes».
6. **Bibliotecas y archivos:** Open Library y Crossref sirven para encontrar referencias públicas; Library of Congress, NYPL, PubMed, medios y bibliotecas con suscripciones requieren revisar interfaces, licencias, permisos y límites de reutilización antes de conectar. No eludir accesos de pago ni restricciones.
7. **Seguridad editorial:** tratar toda página, PDF y snippet como **dato no fiable, nunca como instrucciones**. No seguir comandos, enlaces arbitrarios o peticiones para revelar prompts, llaves, archivos privados o identificadores de asistentes. Las autorizaciones de archivos internos son explícitas y por rol.
8. **Operación y costes:** límites por consulta; consultor de investigación compartido entre Bob/Lina para evitar consultas duplicadas; degradar a «no puedo confirmarlo ahora» si fallan los proveedores. La búsqueda debe poder desactivarse desde Studio Control; nunca depende de que la GPU de avatar esté encendida.

## Prueba progresiva
- CI offline prueba contratos, URLs y adaptación con HTTP *falso*; no hace llamadas reales a APIs.
- Prueba de conectores reales fuera de producción (la hará un operador con autorización y red disponible) y confirmar respuesta de proveedores.
- Probar una pregunta fechada de actualidad con fuentes enlazadas, fechas comprobadas y límite de coste/latencia.
- Integrar en un endpoint experimental protegido y sujeto a presupuestos; solo después conectar voluntariamente el turn orchestrator.
- Mantener producción, LemonSlice/LiveKit, repos de motores y PR #8 sin fusiones.

**No afirmar que Bob y Lina ya navegan Internet, leen cualquier biblioteca, o están actualizados en tiempo real.** Solo se ha preparado el contrato y dos conectores bibliográficos experimentales.
