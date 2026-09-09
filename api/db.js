const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST || "benoitlaprise-db",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "benoitlaprise",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "benoitlaprise",
});

module.exports = pool;
