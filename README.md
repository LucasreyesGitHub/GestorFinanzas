# Finanzas Personal 🌿

App web progresiva de gestión financiera con login por Google.

## Stack
- **Next.js 14** (App Router)
- **NextAuth.js** — autenticación con Google
- **Tailwind CSS** — estilos
- **Turso** — base de datos SQLite serverless
- **Parser local** — interpreta gastos en lenguaje natural sin APIs externas

---

## Setup en VS Code (primera vez)

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.local.example .env.local
```
Editá `.env.local` con tus credenciales (ver sección abajo).

### 3. Correr en desarrollo
```bash
npm run dev
```
Abrí http://localhost:3000

---

## Manual de autenticación

La app utiliza NextAuth con Google como proveedor. Este manual explica cómo crear las credenciales en Google Cloud y configurar las variables de entorno.

### 1. Crear credenciales de Google OAuth

1. Abrí el panel de Google Cloud: https://console.cloud.google.com
2. Seleccioná o creá un proyecto nuevo.
3. En el menú izquierdo, andá a **APIs y servicios** → **Pantalla de consentimiento OAuth**.
4. Configurá la pantalla de consentimiento:
   - Tipo de usuario: `Externo` o `Interno` según tu cuenta.
   - Nombre de la app, correo de soporte y datos básicos.
   - Guardá los cambios.
5. Andá a **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**.
6. Seleccioná **Aplicación web**.
7. En **Orígenes autorizados** agregá:
   - `http://localhost:3000`
8. En **URI de redireccionamiento autorizados** agregá:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://TU-APP.vercel.app/api/auth/callback/google` (para producción)
9. Guardá y copiá los valores de `CLIENT_ID` y `CLIENT_SECRET`.

### 2. Configurar `.env.local`

Copiá `.env.local.example` a `.env.local` y reemplazá los valores:

```
NEXTAUTH_SECRET=TU_SECRET_AQUI
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret
TURSO_DATABASE_URL=libsql://tu-db.turso.io
TURSO_AUTH_TOKEN=eyTU_TOKEN_AQUI
```

### 3. Generar `NEXTAUTH_SECRET`

En tu terminal ejecutá:

```bash
openssl rand -base64 32
```

Si usás Windows y no tenés `openssl`, podés usar Git Bash, PowerShell con OpenSSL instalado, o un generador en línea.

Pegá el resultado en `.env.local` como `NEXTAUTH_SECRET`.

### 4. Probar en desarrollo

Ejecutá:

```bash
npm run dev
```

Abrí `http://localhost:3000` y usá el botón de Google para iniciar sesión.

### 5. Configuración opcional para producción

- En Vercel, copiá las mismas variables de entorno (`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
- Cambiá `NEXTAUTH_URL` por la URL de producción.
- Agregá el callback de producción en Google Cloud:
  - `https://TU-APP.vercel.app/api/auth/callback/google`

### 6. Si en el futuro querés usar magic links por email

Ese flujo requiere agregar un provider de email en `app/api/auth/[...nextauth]/route.ts` y configurar SMTP:

```
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=tu@gmail.com
EMAIL_SERVER_PASSWORD=tu-app-password
EMAIL_FROM=Finanzas Personal <tu@gmail.com>
```

Pero hoy el proyecto ya está configurado para usar Google.

---

## Generar NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```
Pegá el resultado en `.env.local` como `NEXTAUTH_SECRET`.

---

## Configurar Turso (base de datos)

1. Creá cuenta gratis: https://turso.tech
2. Instalá la CLI:
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```
3. Login y crear DB:
```bash
turso auth login
turso db create finanzas-personal
turso db tokens create finanzas-personal
```
4. Copiá la URL y el token a `.env.local`.

### Esquema de la base de datos

La aplicación usa una tabla `gastos` para guardar cada transacción del usuario.
El archivo `schema.sql` ya está incluido en el proyecto y contiene la definición de la tabla.

### API de gastos

Se agregaron rutas en `app/api/gastos` para gestionar transacciones:

- `GET /api/gastos` — lista los movimientos del usuario autenticado
- `POST /api/gastos` — guarda un nuevo gasto o ingreso usando texto natural
- `DELETE /api/gastos/:id` — elimina una transacción propia
- `PATCH /api/gastos/:id` — actualiza una transacción propia

---

## Deploy en Vercel (para acceder desde el celular)

```bash
npx vercel --prod
```
Configurá las mismas env vars en el panel de Vercel.
La app queda accesible desde cualquier dispositivo.

---

## Estructura del proyecto

```
app/
  api/auth/[...nextauth]/route.ts   ← configuración de NextAuth
  login/page.tsx                    ← pantalla de ingreso
  login/verify/page.tsx             ← confirmación de envío
  page.tsx                          ← dashboard (protegido)
  layout.tsx                        ← fuentes y providers
  globals.css                       ← estilos base

components/
  Providers.tsx                     ← SessionProvider
  Icons.tsx                         ← íconos SVG
```
