const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// GET /api/content/:key — público, retorna o JSON da chave
router.get('/:key', async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT value FROM site_content WHERE key = $1',
            [req.params.key]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Conteúdo não encontrado.' });
        }
        res.json(rows[0].value);
    } catch (err) {
        console.error('[content] GET error:', err.message);
        res.status(500).json({ error: 'Erro ao buscar conteúdo.' });
    }
});

// PUT /api/content/:key — admin only, salva o JSON
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
    const { key } = req.params;
    const value = req.body; // JSON body

    // Chaves permitidas (whitelist de segurança)
    const ALLOWED_KEYS = ['hero_slides', 'section_images'];
    if (!ALLOWED_KEYS.includes(key)) {
        return res.status(400).json({ error: 'Chave de conteúdo inválida.' });
    }

    try {
        await db.query(`
            INSERT INTO site_content (key, value, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (key) DO UPDATE
              SET value = EXCLUDED.value,
                  updated_at = NOW()
        `, [key, JSON.stringify(value)]);

        res.json({ ok: true });
    } catch (err) {
        console.error('[content] PUT error:', err.message);
        res.status(500).json({ error: 'Erro ao salvar conteúdo.' });
    }
});

module.exports = router;
