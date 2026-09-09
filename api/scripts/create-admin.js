/**
 * Crée ou met à jour le compte administrateur.
 * À exécuter DIRECTEMENT sur le NAS (jamais collé ailleurs) :
 *
 *   docker compose exec benoitlaprise-api node scripts/create-admin.js "ton@courriel.com" "TonMotDePasse"
 *
 * Peut être relancé n'importe quand pour changer le mot de passe.
 */
const bcrypt = require("bcryptjs");
const pool = require("../db");

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.js "ton@courriel.com" "TonMotDePasse"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Le mot de passe doit contenir au moins 8 caractères.");
  process.exit(1);
}

(async () => {
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [email.toLowerCase().trim(), hash]
    );
    console.log(`✓ Compte administrateur prêt pour ${email}`);
  } catch (e) {
    console.error("Erreur :", e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
