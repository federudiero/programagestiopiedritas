# Variables obligatorias en Vercel

En Vercel > Project Settings > Environment Variables cargá exactamente estos nombres:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=porgrama-de-productos-costos.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=porgrama-de-productos-costos
VITE_FIREBASE_STORAGE_BUCKET=porgrama-de-productos-costos.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=4780272271
VITE_FIREBASE_APP_ID=1:4780272271:web:b9ef6ca9d20722ef4e1efa
VITE_ALLOWED_EMAIL=federudiero@gmail.com
VITE_CUENTA_ID=
```

Después de cambiar variables en Vercel, hacé Redeploy.

Error común: escribir `ITE_FIREBASE_API_KEY` en vez de `VITE_FIREBASE_API_KEY`.
