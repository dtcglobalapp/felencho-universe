# Inventario de solo lectura — La Bestia

**Estado:** herramienta creada en rama aislada; sin ejecución en La Bestia y sin integración con el panel aún.

## Garantías
- No detiene ni reinicia 7892, 3002 o 7894.
- No accede a contenido de archivos de memoria, medios, modelos, llaves, bases de datos ni registros.
- No sube reportes ni consulta API remota; solo lee metadatos locales.
- No ejecuta comandos con shell y limita los comandos externos a Git, versiones y observación de sockets.
- Sin `--output` imprime JSON por consola. Con `--output` crea **un** archivo local con permisos 0600 y rehúsa sobrescribirlo.
- El inventario **no** constituye copia de seguridad ni prueba de restauración.

## Ejecución manual opcional (una vez, en una terminal existente)
Desde el checkout de la rama `feature/studio-disaster-recovery-v1`:

```bash
python3 tools/recovery/inventory_readonly.py --repo . --output "$HOME/felencho-inventory-$(date +%Y%m%d-%H%M%S).json"
```

No hacer `git checkout` sobre el directorio que utiliza Studio Control: si se quiere probar esta rama, trabajar en una copia de trabajo **separada**; no cambiar el checkout activo. El comando no requiere dependencias de Python adicionales.

El informe contiene PID y nombres de procesos en puertos locales, conteos de archivos, tamaños inmediatos, marcas de modificación y estado del Git local (sin nombres de archivos). Tratarlo como interno, no subirlo a un repositorio público. El script deliberadamente no revela nombres de archivos `.env`, rutas absolutas, claves, datos personales ni contenido de bibliotecas.

## Interpretación
- `listener_observed=false` con `reliable=false` significa que `lsof` no encontró datos confiables. No inferir que el servicio está apagado.
- `known_storage_locations.*.metadata.total_immediate_bytes` **no** mide tamaño recursivo, solo archivos directamente dentro de cada directorio. No sirve para estimar un backup total.
- Los directorios de caché son candidatos, no pruebas de que haya pesos completos de modelos.
- Las tablas Supabase solo son referencias extraídas de código; no se leen sus datos.
- El inventario no verifica respaldos anteriores.

## Próxima fase
Hacer primero una prueba controlada en entorno Mac y revisar JSON para filtrar metadatos sensibles; entonces integrar el lector en una acción privada **Auditar** dentro de Studio Control, conservando intacta su interfaz y sin añadir nada a las pantallas de Bob y Lina. La integración debe ser un proceso hijo con timeout, ruta explícita y verificación de éxito; nunca se ejecuta automáticamente al abrir el panel.
