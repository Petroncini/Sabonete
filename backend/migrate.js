const fs = require('fs');
const path = require('path');
const db = require('./db');

const SCRIPTS_DIR = path.join(__dirname, 'init-scripts');

async function migrate() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const files = fs.readdirSync(SCRIPTS_DIR)
        .filter(f => f.endsWith('.sql'))
        .sort();

    for (const file of files) {
        const { rows } = await db.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
        if (rows.length > 0) {
            console.log(`[MIGRATE] ${file} já aplicado, pulando.`);
            continue;
        }

        console.log(`[MIGRATE] aplicando ${file}...`);
        const sql = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8');

        const client = await db.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`[MIGRATE] ${file} aplicado com sucesso.`);
        } catch (err) {
            await client.query('ROLLBACK');
            throw new Error(`Falha ao aplicar ${file}: ${err.message}`);
        } finally {
            client.release();
        }
    }
}

migrate()
    .then(() => db.pool.end())
    .then(() => {
        console.log('[MIGRATE] concluído.');
        process.exit(0);
    })
    .catch(err => {
        console.error('[MIGRATE] erro:', err);
        process.exit(1);
    });
