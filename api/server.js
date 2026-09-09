const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET manquant — défini-le dans .env avant de démarrer.");
  process.exit(1);
}

const COOKIE_NAME = "bl_admin_session";
const PORT = process.env.PORT || 3000;

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());

/* ---------- Anti brute-force simple (en mémoire) ---------- */
const loginAttempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function tooManyAttempts(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}
function registerFailedAttempt(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}
function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

/* ---------- Middleware d'authentification ---------- */
function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "Non authentifié" });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Session invalide ou expirée" });
  }
}

/* ---------- Auth ---------- */
app.post("/api/login", async (req, res) => {
  const ip = req.ip;
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ error: "Trop de tentatives — réessaie dans quelques minutes." });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Courriel et mot de passe requis." });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_users WHERE email = $1", [
      String(email).toLowerCase().trim(),
    ]);
    const user = result.rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!ok) {
      registerFailedAttempt(ip);
      return res.status(401).json({ error: "Identifiants invalides." });
    }

    clearAttempts(ip);
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "12h" });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
      path: "/",
    });
    res.json({ ok: true, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

app.get("/api/session", (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.json({ authenticated: false });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, email: data.email });
  } catch (e) {
    res.json({ authenticated: false });
  }
});

/* ---------- Lecture publique (utilisée par le site public) ---------- */
app.get("/api/contact", async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'contact'");
    res.json(r.rows[0]?.data || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/zones", async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'zones'");
    res.json(r.rows[0]?.data || { regions: [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ---------- Écriture protégée (admin seulement) ---------- */
app.put("/api/contact", requireAuth, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "Format invalide." });
  }
  try {
    await pool.query(
      `INSERT INTO site_data (key, data, updated_at) VALUES ('contact', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.put("/api/zones", requireAuth, async (req, res) => {
  const data = req.body;
  if (!data || !Array.isArray(data.regions)) {
    return res.status(400).json({ error: "Format invalide (attendu: { regions: [...] })." });
  }
  try {
    await pool.query(
      `INSERT INTO site_data (key, data, updated_at) VALUES ('zones', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`benoitlaprise-api en écoute sur le port ${PORT}`));
