const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// Upload de imagens de produto
// ============================================================
// Em produção (Railway), UPLOAD_DIR deve apontar pra um volume persistente
// montado no serviço — sem isso, qualquer redeploy apaga as imagens enviadas,
// já que o filesystem do container não é persistente entre deploys.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            return cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.'));
        }
        cb(null, true);
    },
});

// Upload de imagem (Apenas Admin) — retorna a URL pra salvar em imagem_url
router.post('/upload', authenticateToken, requireAdmin, (req, res) => {
    upload.single('imagem')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Erro ao enviar imagem.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }
        res.json({ url: `/uploads/${req.file.filename}` });
    });
});

// Listar todos os produtos, com as tags de cada um (Acesso Público)
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, COALESCE(
                json_agg(json_build_object('id', t.id, 'nome', t.nome)) FILTER (WHERE t.id IS NOT NULL),
                '[]'
            ) AS tags
            FROM produtos p
            LEFT JOIN produto_tags pt ON pt.produto_id = p.id
            LEFT JOIN tags t ON t.id = pt.tag_id
            GROUP BY p.id
            ORDER BY p.id ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar produtos." });
    }
});

// Substitui as tags associadas a um produto pela lista fornecida.
async function sincronizarTags(client, produtoId, tagIds) {
    await client.query('DELETE FROM produto_tags WHERE produto_id = $1', [produtoId]);
    if (!Array.isArray(tagIds) || tagIds.length === 0) return;

    const values = tagIds.map((_, i) => `($1, $${i + 2})`).join(',');
    await client.query(
        `INSERT INTO produto_tags (produto_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`,
        [produtoId, ...tagIds]
    );
}

// Cadastrar novo produto (Apenas Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    const client = await db.connect();
    try {
        const { nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque, imagem_url, tag_ids } = req.body;

        await client.query('BEGIN');

        const newProduct = await client.query(
            `INSERT INTO produtos
            (nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque, imagem_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque || 0, imagem_url]
        );

        await sincronizarTags(client, newProduct.rows[0].id, tag_ids);
        await client.query('COMMIT');

        res.status(201).json(newProduct.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: "Erro ao criar produto." });
    } finally {
        client.release();
    }
});

// Atualizar produto / estoque (Apenas Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;
        const { nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque, imagem_url, tag_ids } = req.body;

        await client.query('BEGIN');

        const updatedProduct = await client.query(
            `UPDATE produtos SET
            nome = COALESCE($1, nome),
            descricao = COALESCE($2, descricao),
            preco = COALESCE($3, preco),
            peso_gramas = COALESCE($4, peso_gramas),
            comprimento_cm = COALESCE($5, comprimento_cm),
            largura_cm = COALESCE($6, largura_cm),
            altura_cm = COALESCE($7, altura_cm),
            estoque = COALESCE($8, estoque),
            imagem_url = COALESCE($9, imagem_url)
            WHERE id = $10 RETURNING *`,
            [nome, descricao, preco, peso_gramas, comprimento_cm, largura_cm, altura_cm, estoque, imagem_url, id]
        );

        if (updatedProduct.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Produto não encontrado." });
        }

        if (tag_ids !== undefined) {
            await sincronizarTags(client, id, tag_ids);
        }

        await client.query('COMMIT');
        res.json(updatedProduct.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: "Erro ao atualizar produto." });
    } finally {
        client.release();
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
