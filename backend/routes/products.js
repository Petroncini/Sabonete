const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// Listar todos os produtos (Acesso Público)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM produtos ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar produtos." });
    }
});

// Cadastrar novo produto (Apenas Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque } = req.body;

        const newProduct = await db.query(
            `INSERT INTO produtos 
            (nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque || 0]
        );

        res.status(201).json(newProduct.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao criar produto." });
    }
});

// Atualizar produto / estoque (Apenas Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque } = req.body;

        const updatedProduct = await db.query(
            `UPDATE produtos SET 
            nome = COALESCE($1, nome),
            descricao = COALESCE($2, descricao),
            preco = COALESCE($3, preco),
            peso_gramas = COALESCE($4, peso_gramas),
            comprimento_cm = COALESCE($5, comprimento_cm),
            largura_cm = COALESCE($6, largura_cm),
            altura_cm = COALESCE($7, altura_cm),
            estoque = COALESCE($8, estoque)
            WHERE id = $9 RETURNING *`,
            [nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque, id]
        );

        if (updatedProduct.rows.length === 0) {
            return res.status(404).json({ error: "Produto não encontrado." });
        }

        res.json(updatedProduct.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao atualizar produto." });
    }
});

// Deletar produto (Apenas Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await db.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);

        if (deletedProduct.rows.length === 0) {
            return res.status(404).json({ error: "Produto não encontrado." });
        }

        res.json({ message: "Produto deletado com sucesso." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao deletar produto." });
    }
});

module.exports = router;
