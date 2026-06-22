const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Listar todas as tags (Acesso Público — usado pros filtros da loja)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tags ORDER BY nome ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar tags." });
    }
});

// Criar nova tag (Apenas Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { nome } = req.body;
        if (!nome || !nome.trim()) {
            return res.status(400).json({ error: "Nome da tag é obrigatório." });
        }

        const newTag = await db.query(
            'INSERT INTO tags (nome) VALUES ($1) RETURNING *',
            [nome.trim()]
        );
        res.status(201).json(newTag.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // unique_violation
            return res.status(400).json({ error: "Essa tag já existe." });
        }
        console.error(error);
        res.status(500).json({ error: "Erro ao criar tag." });
    }
});

// Deletar tag (Apenas Admin) — remove também das associações de produto
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await db.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);

        if (deleted.rows.length === 0) {
            return res.status(404).json({ error: "Tag não encontrada." });
        }

        res.json({ message: "Tag removida com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao remover tag." });
    }
});

module.exports = router;
