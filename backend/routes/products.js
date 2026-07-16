const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// Upload de imagens de produto — Cloudflare R2
// ============================================================
// Imagens são guardadas no Cloudflare R2 (S3-compatible) e servidas
// diretamente pela URL pública do bucket. Sem volume persistente,
// sem risco de perder arquivo em redeploy.
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            return cb(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.'));
        }
        cb(null, true);
    },
});

// Upload de imagem (Apenas Admin) — envia pro R2 e retorna a URL pública
router.post('/upload', authenticateToken, requireAdmin, (req, res) => {
    upload.single('imagem')(req, res, async (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Erro ao enviar imagem.' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const key = `${crypto.randomUUID()}${ext}`;

        try {
            await r2.send(new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            }));

            const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
            res.json({ url: publicUrl });
        } catch (uploadErr) {
            console.error('[R2] Erro ao enviar imagem:', uploadErr.message);
            res.status(500).json({ error: 'Erro ao salvar imagem.' });
        }
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
        if (error.code === '23503') { // foreign_key_violation
            return res.status(409).json({
                error: "Esse produto já aparece em pedidos feitos por clientes e não pode ser removido (isso quebraria o histórico de vendas). Em vez de remover, zere o estoque pra ele deixar de aparecer pra venda.",
            });
        }
        console.error(error);
        res.status(500).json({ error: "Erro ao deletar produto." });
    }
});

module.exports = router;
