# Deploy en Vercel / Netlify

## Instalación local segura

```bash
npm config set ignore-scripts true
npm install --ignore-scripts
npm run dev
```

## Build local

```bash
npm run build
```

## Vercel

Configuración incluida en `vercel.json`:

- Framework: Vite
- Install command: `npm install --ignore-scripts`
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: todas las rutas vuelven a `index.html`

Variables necesarias en Vercel:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ALLOWED_EMAIL=federudiero@gmail.com
```

## Netlify

Configuración incluida en `netlify.toml` y `public/_redirects`:

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: `/* /index.html 200`
- Install seguro con `NPM_FLAGS=--ignore-scripts`

Variables necesarias en Netlify: las mismas `VITE_FIREBASE_*` del `.env.example`.

## Nota

El ZIP no incluye `node_modules` ni `package-lock.json`. Instalá dependencias limpio en tu máquina o en el deploy para evitar errores de bindings nativos creados en otro sistema operativo.
