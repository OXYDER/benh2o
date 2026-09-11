const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
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

/* ---------- Limite anti-spam sur le formulaire de contact (2 min entre deux envois) ---------- */
const formSubmissions = new Map(); // ip -> dernier envoi (timestamp)
const FORM_RATE_LIMIT_MS = 2 * 60 * 1000;

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

app.get("/api/content", async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'content'");
    res.json(r.rows[0]?.data || {});
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.get("/api/distributeurs", async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'distributeurs'");
    res.json(r.rows[0]?.data || []);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

/* ---------- SMTP : lecture protégée (le mot de passe n'est jamais renvoyé) ---------- */
app.get("/api/smtp", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'smtp'");
    const data = r.rows[0]?.data || {};
    const { password, ...rest } = data;
    res.json({ ...rest, passwordSet: !!password });
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

app.put("/api/content", requireAuth, async (req, res) => {
  const data = req.body;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return res.status(400).json({ error: "Format invalide." });
  }
  try {
    await pool.query(
      `INSERT INTO site_data (key, data, updated_at) VALUES ('content', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.put("/api/distributeurs", requireAuth, async (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) {
    return res.status(400).json({ error: "Format invalide (attendu: un tableau)." });
  }
  try {
    await pool.query(
      `INSERT INTO site_data (key, data, updated_at) VALUES ('distributeurs', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.put("/api/smtp", requireAuth, async (req, res) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
    return res.status(400).json({ error: "Format invalide." });
  }
  try {
    const existingRes = await pool.query("SELECT data FROM site_data WHERE key = 'smtp'");
    const existing = existingRes.rows[0]?.data || {};
    // Un mot de passe vide dans la requête = on garde l'ancien (jamais renvoyé au navigateur, donc jamais écrasé par erreur).
    const merged = { ...incoming, password: incoming.password ? incoming.password : existing.password || "" };
    await pool.query(
      `INSERT INTO site_data (key, data, updated_at) VALUES ('smtp', $1, now())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = now()`,
      [JSON.stringify(merged)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.post("/api/smtp/test", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("SELECT data FROM site_data WHERE key = 'smtp'");
    const smtp = r.rows[0]?.data || {};
    if (!smtp.host || !smtp.user || !smtp.password) {
      return res.status(400).json({ error: "Remplis et enregistre au moins l'hôte, l'utilisateur et le mot de passe avant de tester." });
    }
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: !!smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
    });
    await transporter.verify();
    const testTo = smtp.toEmail || smtp.fromEmail || smtp.user;
    await transporter.sendMail({
      from: `"${smtp.fromName || "Test SMTP"}" <${smtp.fromEmail || smtp.user}>`,
      to: testTo,
      subject: "Test SMTP — benoitlaprise.com",
      text: `Ceci est un courriel de test envoyé depuis /admin le ${new Date().toLocaleString("fr-CA")}. Si tu le reçois, ta configuration SMTP fonctionne correctement.`,
    });
    res.json({ ok: true, message: `Courriel de test envoyé à ${testTo}.` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Échec : " + (e.message || "erreur inconnue") });
  }
});

/* ---------- Formulaire de contact public (limité à un envoi par 2 minutes par visiteur) ---------- */
app.post("/api/contact-form", async (req, res) => {
  const ip = req.ip;
  const last = formSubmissions.get(ip);
  if (last && Date.now() - last < FORM_RATE_LIMIT_MS) {
    const waitSec = Math.ceil((FORM_RATE_LIMIT_MS - (Date.now() - last)) / 1000);
    return res.status(429).json({
      error: `Merci de patienter encore ${waitSec} seconde${waitSec > 1 ? "s" : ""} avant d'envoyer un autre message.`,
    });
  }

  const { name, erabliere, ville, tel, courriel, message } = req.body || {};
  if (!name || !ville || !courriel || !message) {
    return res.status(400).json({ error: "Merci de remplir les champs obligatoires." });
  }

  try {
    const [smtpRes, contactRes] = await Promise.all([
      pool.query("SELECT data FROM site_data WHERE key = 'smtp'"),
      pool.query("SELECT data FROM site_data WHERE key = 'contact'"),
    ]);
    const smtp = smtpRes.rows[0]?.data || {};
    const contact = contactRes.rows[0]?.data || {};
    const subject = "Nouvelle demande — benoitlaprise.com";
    const bodyText =
      `Nom : ${name}\n` +
      `Érablière : ${erabliere || "—"}\n` +
      `Ville / MRC : ${ville}\n` +
      `Téléphone : ${tel || "—"}\n` +
      `Courriel : ${courriel}\n\n` +
      `Message :\n${message}`;

    if (smtp.actif && smtp.host && smtp.user && smtp.password && smtp.toEmail) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port) || 587,
        secure: !!smtp.secure,
        auth: { user: smtp.user, pass: smtp.password },
      });
      await transporter.sendMail({
        from: `"${smtp.fromName || contact.nom || "Site web"}" <${smtp.fromEmail || smtp.user}>`,
        to: smtp.toEmail,
        replyTo: courriel,
        subject,
        text: bodyText,
      });
    } else {
      // Repli : FormSubmit.co (service externe gratuit), appelé depuis le serveur.
      const fsEmail = contact.formsubmitEmail || contact.courriel;
      if (!fsEmail) {
        return res.status(500).json({ error: "Aucune adresse de destination n'est configurée." });
      }
      const fsRes = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(fsEmail)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Nom: name,
          Érablière: erabliere || "",
          "Ville / MRC": ville,
          Téléphone: tel || "",
          Courriel: courriel,
          Message: message,
          _subject: subject,
        }),
      });
      if (!fsRes.ok) throw new Error("FormSubmit a répondu avec une erreur.");
    }

    formSubmissions.set(ip, Date.now());
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "L'envoi a échoué. Réessaie plus tard ou contacte-moi directement par téléphone." });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ---------- Rendez-vous ---------- */
const appointmentSubmissions = new Map(); // ip -> dernier envoi

async function sendMail({ smtp, contact, to, subject, text, replyTo }) {
  if (smtp.actif && smtp.host && smtp.user && smtp.password) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: !!smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
    });
    await transporter.sendMail({
      from: `"${smtp.fromName || contact.nom || "Site web"}" <${smtp.fromEmail || smtp.user}>`,
      to,
      replyTo,
      subject,
      text,
    });
    return true;
  }
  return false;
}

app.post("/api/appointments", async (req, res) => {
  const ip = req.ip;
  const last = appointmentSubmissions.get(ip);
  if (last && Date.now() - last < FORM_RATE_LIMIT_MS) {
    const waitSec = Math.ceil((FORM_RATE_LIMIT_MS - (Date.now() - last)) / 1000);
    return res.status(429).json({
      error: `Merci de patienter encore ${waitSec} seconde${waitSec > 1 ? "s" : ""} avant d'envoyer une autre demande.`,
    });
  }

  const {
    nom, erabliere, nbEntailles, adresse, ville, dejaClient,
    lieu, courriel, telephone, dateDemandee, heureDemandee,
  } = req.body || {};

  if (!nom || !ville || !lieu || !dateDemandee || !heureDemandee || (!courriel && !telephone)) {
    return res.status(400).json({ error: "Merci de remplir les champs obligatoires (dont un moyen de te joindre)." });
  }
  if (!["bureau", "client"].includes(lieu)) {
    return res.status(400).json({ error: "Lieu de rendez-vous invalide." });
  }

  try {
    const r = await pool.query(
      `INSERT INTO appointments
        (nom, erabliere, nb_entailles, adresse, ville, deja_client, lieu, courriel, telephone, date_demandee, heure_demandee)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [nom, erabliere || null, nbEntailles || null, adresse || null, ville, !!dejaClient, lieu, courriel || null, telephone || null, dateDemandee, heureDemandee]
    );

    // Avertir Benoît par courriel (best-effort — la demande reste enregistrée même si l'envoi échoue).
    try {
      const [smtpRes, contactRes] = await Promise.all([
        pool.query("SELECT data FROM site_data WHERE key = 'smtp'"),
        pool.query("SELECT data FROM site_data WHERE key = 'contact'"),
      ]);
      const smtp = smtpRes.rows[0]?.data || {};
      const contact = contactRes.rows[0]?.data || {};
      const lieuTxt = lieu === "bureau" ? "À ton bureau (Ham-Nord)" : "Chez le client";
      const text =
        `Nouvelle demande de rendez-vous — à confirmer dans /admin\n\n` +
        `Nom : ${nom}\nÉrablière : ${erabliere || "—"}\nNombre d'entailles : ${nbEntailles || "—"}\n` +
        `Adresse : ${adresse || "—"}\nVille : ${ville}\nDéjà client H2O Innovation : ${dejaClient ? "Oui" : "Non"}\n` +
        `Lieu : ${lieuTxt}\nCourriel : ${courriel || "—"}\nTéléphone : ${telephone || "—"}\n` +
        `Date demandée : ${dateDemandee} à ${heureDemandee}`;
      const toEmail = smtp.toEmail || contact.formsubmitEmail || contact.courriel;
      if (toEmail) {
        const sent = await sendMail({ smtp, contact, to: toEmail, subject: "Nouvelle demande de rendez-vous", text, replyTo: courriel });
        if (!sent) {
          const fsEmail = contact.formsubmitEmail || contact.courriel;
          if (fsEmail) {
            await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(fsEmail)}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ _subject: "Nouvelle demande de rendez-vous", Message: text }),
            });
          }
        }
      }
    } catch (mailErr) {
      console.error("Notification rendez-vous échouée:", mailErr);
    }

    appointmentSubmissions.set(ip, Date.now());
    res.json({ ok: true, id: r.rows[0].id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "L'envoi a échoué. Réessaie plus tard ou contacte-moi directement." });
  }
});

app.get("/api/appointments", requireAuth, async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM appointments ORDER BY date_demandee ASC, heure_demandee ASC");
    res.json(r.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.put("/api/appointments/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { statut, dateAlternative, heureAlternative, noteAdmin } = req.body || {};
  if (!["confirme", "refuse", "en_attente"].includes(statut)) {
    return res.status(400).json({ error: "Statut invalide." });
  }
  try {
    const r = await pool.query(
      `UPDATE appointments
       SET statut = $1, date_alternative = $2, heure_alternative = $3, note_admin = $4, updated_at = now()
       WHERE id = $5 RETURNING *`,
      [statut, dateAlternative || null, heureAlternative || null, noteAdmin || null, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Rendez-vous introuvable." });
    const appt = r.rows[0];

    let emailSent = false;
    if (appt.courriel && statut !== "en_attente") {
      try {
        const [smtpRes, contactRes] = await Promise.all([
          pool.query("SELECT data FROM site_data WHERE key = 'smtp'"),
          pool.query("SELECT data FROM site_data WHERE key = 'contact'"),
        ]);
        const smtp = smtpRes.rows[0]?.data || {};
        const contact = contactRes.rows[0]?.data || {};
        let text;
        let subject;
        if (statut === "confirme") {
          subject = "Ton rendez-vous est confirmé";
          text = `Bonjour ${appt.nom},\n\nTon rendez-vous du ${appt.date_demandee.toISOString().slice(0,10)} à ${appt.heure_demandee} est confirmé.\n\n${noteAdmin ? "Note : " + noteAdmin + "\n\n" : ""}À bientôt,\n${contact.nom || "Benoît Laprise"}`;
        } else {
          subject = "Concernant ta demande de rendez-vous";
          const altTxt = dateAlternative
            ? `Je te propose plutôt le ${dateAlternative}${heureAlternative ? " à " + heureAlternative : ""}. Fais-moi savoir si ça te convient.`
            : "Je ne suis malheureusement pas disponible à ce moment — contacte-moi pour trouver un autre moment.";
          text = `Bonjour ${appt.nom},\n\nJe ne suis pas disponible pour le rendez-vous demandé (${appt.date_demandee.toISOString().slice(0,10)} à ${appt.heure_demandee}).\n\n${altTxt}\n\n${noteAdmin ? "Note : " + noteAdmin + "\n\n" : ""}Merci de ta compréhension,\n${contact.nom || "Benoît Laprise"}`;
        }
        emailSent = await sendMail({ smtp, contact, to: appt.courriel, subject, text });
      } catch (mailErr) {
        console.error("Notification client échouée:", mailErr);
      }
    }

    res.json({ ok: true, appointment: appt, emailSent });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

app.listen(PORT, () => console.log(`benoitlaprise-api en écoute sur le port ${PORT}`));
