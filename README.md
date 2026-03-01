# Deploy Pipeline Test

Minimal Node.js + Express project to verify: Git push → hosting deploy → env vars → backend → frontend.

## Run Locally

```bash
npm install

# Optional: set env vars first
export PUBLIC_TEST_VAR="hello-public"
export SECRET_TEST_VAR="hello-secret"

npm start
# Open http://localhost:3000
```

On Windows (PowerShell):
```powershell
$env:PUBLIC_TEST_VAR = "hello-public"
$env:SECRET_TEST_VAR = "hello-secret"
npm start
```

On Windows (CMD):
```cmd
set PUBLIC_TEST_VAR=hello-public
set SECRET_TEST_VAR=hello-secret
npm start
```

## Environment Variables

| Variable         | Where used | Purpose                        |
|------------------|------------|--------------------------------|
| `PUBLIC_TEST_VAR`  | Frontend   | Injected into HTML at request time |
| `SECRET_TEST_VAR`  | Backend    | Returned via `/api/hello`      |
| `PORT`           | Backend    | Server port (default: 3000)    |

## Deploy

### Vercel
- Add `vercel.json` (see below) or set `outputDirectory` to `.`
- Set env vars in the Vercel dashboard

```json
{
  "version": 2,
  "builds": [{ "src": "index.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "index.js" }]
}
```

### Railway / Render / Replit
- Point start command to `npm start`
- Set `PUBLIC_TEST_VAR` and `SECRET_TEST_VAR` in platform env settings
- `PORT` is set automatically by the platform

## What a Passing Test Looks Like

```
✅ Frontend card    → "Hello from Frontend"
✅ Env card         → value of PUBLIC_TEST_VAR
✅ Backend card     → "Hello from Backend" + SECRET_TEST_VAR value
```
