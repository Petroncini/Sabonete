const { Pool } = require('pg');
require('dotenv').config();

// Railway injeta DATABASE_URL automaticamente.
// Localmente, usamos as variáveis individuais do .env.
const pool = process.env.DATABASE_URL
    ? new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // necessário no Railway/Render
    })
    : new Pool({
        user:     process.env.DB_USER     || 'admin',
        host:     process.env.DB_HOST     || 'localhost',
        database: process.env.DB_NAME     || 'sabonete',
        password: process.env.DB_PASSWORD || 'admin_password',
        port:     parseInt(process.env.DB_PORT) || 5432,
    });

module.exports = {
    query:   (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
    pool,
};
