# TriageAI — Setup Guide

## Step 1: Install dependencies
```bash
npm install
```

## Step 2: Fill in .env.local
Open `.env.local` and fill in:
- DATABASE_URL → your PostgreSQL from Supabase
- ANTHROPIC_API_KEY → from console.anthropic.com
- JWT_SECRET → run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- RESEND_API_KEY → from resend.com (optional, for emergency emails)

## Step 3: Set up database
```bash
npx prisma generate
npx prisma db push
```

## Step 4: Run the app
```bash
npm run dev
```

Open http://localhost:3000

## Pages
- / → Landing page (signup/login)
- /dashboard → User dashboard (after login)
- /consultation → AI chat interface

## API Routes
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
- PATCH /api/user
- POST /api/chat
- POST /api/emergency/send
- POST /api/files/upload
- DELETE /api/files/[id]
