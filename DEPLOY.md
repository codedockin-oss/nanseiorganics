# Nansai Organics — Deployment Guide

## Project Structure
```
agri store/
├── pages/          ← Frontend HTML (Netlify publish dir)
├── js/             ← Shared JS (config.js)
├── frontend/js/    ← API + cart helpers
├── backend/        ← Node.js/Express API (Render)
├── netlify.toml    ← Netlify config
└── render.yaml     ← Render config
```

---

## ⚠️ Before You Push to GitHub

1. **Rotate your JWT_SECRET** — the current one is exposed:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Paste the output into Render's env vars (not in `.env` committed to Git).

2. **Rotate Twilio credentials** — go to [console.twilio.com](https://console.twilio.com) → regenerate Auth Token.

3. **Confirm `.env` is gitignored** — run `git status` and make sure `backend/.env` does NOT appear.

---

## Step 1 — Push to GitHub

```bash
git init          # if not already a repo
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** → `backend`
4. Set **Build Command** → `npm install`
5. Set **Start Command** → `npm start`
6. Add these **Environment Variables** in the Render dashboard:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your MongoDB Atlas connection string |
| `JWT_SECRET` | new 64-char hex (from step above) |
| `JWT_EXPIRE` | `30d` |
| `FRONTEND_URL` | your Netlify URL (fill in after Step 3) |
| `RAZORPAY_KEY_ID` | from Razorpay dashboard |
| `RAZORPAY_KEY_SECRET` | from Razorpay dashboard |
| `TWILIO_ACCOUNT_SID` | from Twilio console |
| `TWILIO_AUTH_TOKEN` | new rotated token |
| `TWILIO_PHONE_NUMBER` | your Twilio number |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | your Gmail address |
| `EMAIL_PASSWORD` | 16-char Gmail App Password |
| `EMAIL_FROM` | `Nansai Organics <your-gmail@gmail.com>` |
| `ADMIN_EMAIL` | `admin@nansaiorganics.com` |

7. Click **Deploy** — your API will be live at `https://nansei-backend.onrender.com`
8. Test it: `https://nansei-backend.onrender.com/api/health`

---

## Step 3 — Deploy Frontend on Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repo
3. **Publish directory** → `pages` (already set in `netlify.toml`)
4. Click **Deploy site**
5. Your site will be live at `https://your-site.netlify.app`

---

## Step 4 — Wire Frontend to Backend

Open `js/config.js` and confirm the production URL matches your Render service:

```js
const PRODUCTION_API = 'https://nansei-backend.onrender.com/api';
```

Then go back to Render → Environment → set `FRONTEND_URL` to your Netlify URL.

---

## Step 5 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → confirm your user has `readWrite` on the DB
3. **Network Access** → Add IP `0.0.0.0/0` (required for Render's dynamic IPs)
4. **Connect** → Drivers → copy the connection string → paste into Render's `MONGODB_URI`

---

## Step 6 — Seed the Database (optional)

```bash
cd backend
npm run seed
```

---

## Local Development

```bash
cd backend
npm install
cp .env.example .env   # fill in your local values
npm run dev            # starts on port 5000

# Open frontend with VS Code Live Server on port 5500
# http://localhost:5500/pages/index.html
```

---

## Security Checklist

- [ ] `.env` is NOT committed to Git
- [ ] `JWT_SECRET` is a fresh 64-char hex
- [ ] Twilio Auth Token has been rotated
- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0`
- [ ] `FRONTEND_URL` is set to your actual Netlify domain on Render
- [ ] Gmail App Password is used (not your real Gmail password)
- [ ] Razorpay keys are live keys (not test) for production
