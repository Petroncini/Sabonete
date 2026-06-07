const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { generatePixPayload } = require('../utils/pix');

const router = express.Router();

// Listar pedidos do usuário logado (Acesso Cliente)
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const pedidos = await db.query('SELECT * FROM pedidos WHERE usuario_id = $1 ORDER BY criado_em DESC', [req.user.id]);
        res.json(pedidos.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar pedidos." });
    }
});

// Listar TODOS os pedidos (Acesso Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pedidos = await db.query('SELECT * FROM pedidos ORDER BY criado_em DESC');
        res.json(pedidos.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar pedidos." });
    }
});

// Criar Pedido (Cliente) - Gerencia transações e condições de corrida no estoque
router.post('/', authenticateToken, async (req, res) => {
    const client = await db.connect(); // Inicia conexão dedicada para transação

    try {
        const { carrinho, endereco_entrega, valor_frete } = req.body;
        
        if (!carrinho || carrinho.length === 0) {
            return res.status(400).json({ error: "Carrinho vazio." });
        }

        await client.query('BEGIN'); // INICIA A TRANSAÇÃO SQL

        let totalProdutos = 0;
        const itensProcessados = [];

        // 1. Verificar e descontar estoque de cada produto (Evita Race Conditions)
        for (let item of carrinho) {
            // O FOR UPDATE dá um lock na linha do produto até o fim da transação. 
            // Se 2 pessoas comprarem o mesmo sabonete exato ao mesmo tempo, 
            // a segunda vai esperar a primeira terminar de descontar.
            const resProduto = await client.query(
                'SELECT preco, estoque FROM produtos WHERE id = $1 FOR UPDATE',
                [item.produto_id]
            );

            if (resProduto.rows.length === 0) {
                throw new Error(`Produto ID ${item.produto_id} não encontrado.`);
            }

            const produtoDb = resProduto.rows[0];

            if (produtoDb.estoque < item.quantidade) {
                throw new Error(`Estoque insuficiente para o produto ID ${item.produto_id}.`);
            }

            // Desconta o estoque
            await client.query(
                'UPDATE produtos SET estoque = estoque - $1 WHERE id = $2',
                [item.quantidade, item.produto_id]
            );

            const precoSubtotal = produtoDb.preco * item.quantidade;
            totalProdutos += precoSubtotal;

            itensProcessados.push({
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: produtoDb.preco
            });
        }

        const totalGeral = totalProdutos + valor_frete;

        // 2. Criar o Pedido no Banco
        const resPedido = await client.query(
            `INSERT INTO pedidos (usuario_id, cliente_nome, cliente_endereco, total, frete, status) 
             VALUES ($1, $2, $3, $4, $5, 'pendente') RETURNING id`,
            [req.user.id, req.user.nome || "Cliente", endereco_entrega, totalGeral, valor_frete]
        );

        const pedidoId = resPedido.rows[0].id;

        // 3. Inserir os itens do pedido
        for (let item of itensProcessados) {
            await client.query(
                `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario) 
                 VALUES ($1, $2, $3, $4)`,
                [pedidoId, item.produto_id, item.quantidade, item.preco_unitario]
            );
        }

        // 4. Gerar o PIX com o ID da Transação (TXID)
        const txid = `PEDIDO${pedidoId}`;
        const pixPayload = generatePixPayload(
            process.env.PIX_KEY || 'chave_padrao@email.com',
            process.env.PIX_MERCHANT_NAME || 'Sabonete Store',
            process.env.PIX_MERCHANT_CITY || 'Sao Paulo',
            txid,
            totalGeral
        );

        // Atualizar o pedido com o TXID gerado
        await client.query('UPDATE pedidos SET txid = $1 WHERE id = $2', [txid, pedidoId]);

        await client.query('COMMIT'); // FINALIZA E CONFIRMA A TRANSAÇÃO

        res.status(201).json({
            message: "Pedido criado com sucesso!",
            pedido_id: pedidoId,
            total: totalGeral,
            pix_copia_cola: pixPayload,
            txid: txid
        });

    } catch (error) {
        await client.query('ROLLBACK'); // SE DEU ERRO (ex: sem estoque), DESFAZ TUDO (Devolve o estoque)
        console.error("Erro na criação do pedido:", error.message);
        res.status(400).json({ error: error.message || "Erro ao processar o pedido." });
    } finally {
        client.release(); // Libera a conexão de volta para o pool
    }
});

// Confirmar Pagamento do Pedido (Apenas Admin)
router.patch('/:id/pagamento', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const pedido = await db.query(
            "UPDATE pedidos SET status = 'pago' WHERE id = $1 RETURNING *",
            [id]
        );

        if (pedido.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        res.json({ message: "Pagamento confirmado!", pedido: pedido.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao confirmar pagamento." });
    }
});

module.exports = router;
