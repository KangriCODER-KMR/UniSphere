# KNIT School Administration Portal

A React, Vite, and Express school administration portal with student, teacher, and administrator dashboards. It uses Firebase Authentication and Firestore data, with optional Gemini, Supabase, SMTP, and Twilio integrations.

## Requirements

- Node.js 20 or newer
- npm
- Firebase project credentials if cloud authentication and Firestore are enabled

## Run locally

```powershell
npm install
$env:PORT="4178"
npm run dev
```

Open `http://localhost:4178`.

For a production build:

```powershell
npm run build
$env:NODE_ENV="production"
$env:PORT="4178"
npm start
```

## Deploy to any Node.js host

This repository includes the complete server and frontend build. Use these settings on Render, Railway, Fly.io, DigitalOcean, or another Node.js host:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Node version: `20` or newer
- Health URL: `/`
- Port: use the host-provided `PORT` environment variable

Set only the integrations you plan to use. See [.env.example](.env.example) for the available variables:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_SENDER` for real email delivery
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS delivery
- `GEMINI_API_KEY` for server-side AI descriptions, study guides, and cover images
- `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_JSON` only when server-side Firebase Admin access is required

AI endpoints require a verified Firebase session. Registration email delivery is rate-limited because it runs before the new account is authenticated. Never put `GEMINI_API_KEY`, Firebase service-account JSON, SMTP credentials, or Twilio credentials in frontend variables such as `VITE_*`.

Do not commit `.env`, service-account JSON files, SMTP passwords, or Twilio tokens.

## Deploy on Render

1. Create a new **Web Service** at [render.com](https://render.com).
2. Connect this repository: [github.com/KangriCODER-KMR/UniSphere](https://github.com/KangriCODER-KMR/UniSphere).
3. Select the Node environment.
4. Set the build command to `npm install && npm run build`.
5. Set the start command to `npm start`.
6. Add required environment variables in Render's Environment page.

Render provides `PORT` automatically. Do not hard-code a production port.

## Deploy on Railway

1. Create a project at [railway.app](https://railway.app).
2. Choose **Deploy from GitHub repo** and select `KangriCODER-KMR/UniSphere`.
3. Railway detects the Node project and runs the build and start scripts from `package.json`.
4. Add any integration environment variables in the service Variables tab.

## GitHub repository

[https://github.com/KangriCODER-KMR/UniSphere](https://github.com/KangriCODER-KMR/UniSphere)

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server with Vite |
| `npm run build` | Build the frontend and production server |
| `npm start` | Run the production server |
| `npm run lint` | Type-check the project |
