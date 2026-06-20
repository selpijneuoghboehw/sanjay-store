# 🚀 Sanjay Karyana Store — Deploy Guide (100% Free)

## Overview
- **Backend** → Render.com (free)
- **Frontend** → Vercel (free)
- **Code hosting** → GitHub (free)

---

## Step 1 — Run Locally First

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Opens at http://localhost:8000
# Test: http://localhost:8000/api/inventory
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Step 2 — Push to GitHub

1. Go to https://github.com → New repository → name it `sanjay-store`
2. In your project folder:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sanjay-store.git
git push -u origin main
```

---

## Step 3 — Deploy Backend on Render.com

1. Go to https://render.com → Sign up free with GitHub
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** Free
5. Add **Environment Variable:**
   - Key: `OWNER_PIN`  Value: `your-secret-pin`
6. Click **Deploy**
7. Copy your Render URL, e.g. `https://sanjay-store.onrender.com`

> ⚠️ Free tier sleeps after 15 min. First visit takes ~30 sec to wake up.

---

## Step 4 — Deploy Frontend on Vercel

1. Go to https://vercel.com → Sign up free with GitHub
2. Click **Add New Project** → Import your repo
3. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add **Environment Variable:**
   - Key: `VITE_API_URL`  Value: `https://sanjay-store.onrender.com` ← your Render URL
5. Click **Deploy**
6. Your app is live at `https://sanjay-store.vercel.app` 🎉

---

## Step 5 — Update PIN securely

Never change the PIN in code. Update it in Render:
- Render Dashboard → Your service → Environment → Edit `OWNER_PIN` → Redeploy

---

## File Structure Reference

```
sanjay-store/
├── backend/
│   ├── main.py            ← FastAPI app (all APIs)
│   ├── requirements.txt
│   ├── inventory.csv      ← auto-created on first run
│   └── orders.csv         ← auto-created on first run
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx          ← routing + header
        ├── api.js           ← all API calls
        ├── index.css        ← dark theme
        ├── components/
        │   ├── PinLock.jsx  ← PIN pad modal
        │   └── Cart.jsx     ← bill panel
        └── pages/
            ├── CustomerView.jsx  ← shop + cart
            └── OwnerView.jsx     ← stats + orders + inventory
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items |
| POST | `/api/inventory` | Add item |
| PUT | `/api/inventory/{name}` | Update item |
| DELETE | `/api/inventory/{name}` | Delete item |
| GET | `/api/orders` | List all orders |
| POST | `/api/orders` | Place order |
| DELETE | `/api/orders/{idx}` | Delete one order |
| DELETE | `/api/orders` | Clear all orders |
| POST | `/api/auth/verify` | Verify owner PIN |
