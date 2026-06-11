# Cambios incluidos

## Firebase en Vercel

- La app ahora lee variables `VITE_FIREBASE_*`.
- También tolera el error común `ITE_FIREBASE_*` para que no quede en modo local si falta la V.
- Si Vercel no entrega las variables, usa una configuración interna de respaldo del proyecto `porgrama-de-productos-costos`.
- En la pantalla de login se muestra el proyecto Firebase detectado y si viene desde env o respaldo.

Después de cambiar variables en Vercel, siempre hacer Redeploy.

## Carga de pedidos más simple

La sección Pedidos quedó dividida en:

1. Carga rápida
2. Manual / corregir
3. Pedidos cargados

La carga rápida queda como flujo principal: fecha, texto, procesar y guardar desde vista previa.
