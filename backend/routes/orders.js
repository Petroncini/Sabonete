const express = require('express');
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');
const { createPixPayment, getPixPaymentStatus, refundPayment } = require('../utils/pix');
const { enviarEmailEnvio } = require('../utils/email');
const { calcularOpcoesFrete } = require('./shipping');

const router = express.Router();

// ── Listar pedidos do usuário logado (Cliente) ───────────────────────────────
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const pedidos = await db.query(
            'SELECT * FROM pedidos WHERE usuario_id = $1 ORDER BY criado_em DESC',
            [req.user.id]
        );
        res.json(pedidos.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar pedidos." });
    }
});

// ── Listar TODOS os pedidos com dados do cliente (Admin) ──────────────────────
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const pedidos = await db.query(`
            SELECT p.*, u.email as email_cliente
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.criado_em DESC
        `);
        res.json(pedidos.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar pedidos." });
    }
});

// ── Detalhes de um pedido específico com itens (Admin) ───────────────────────
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const pedidoRes = await db.query(`
            SELECT p.*, u.email as email_cliente
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = $1
        `, [id]);

        if (pedidoRes.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const itensRes = await db.query(`
            SELECT pi.quantidade, pi.preco_unitario, pr.nome, pr.imagem_url
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
        `, [id]);

        res.json({
            ...pedidoRes.rows[0],
            itens: itensRes.rows,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao buscar detalhes do pedido." });
    }
});

// ── Criar Pedido (Cliente) ─────────────────────────────────────────────────────
router.post('/', authenticateToken, async (req, res) => {
    const client = await db.connect();

    try {
        const { carrinho, endereco_entrega, cep_destino, frete_id, email_pagador } = req.body;

        if (!carrinho || carrinho.length === 0) {
            return res.status(400).json({ error: "Carrinho vazio." });
        }
        if (!cep_destino || frete_id === undefined || frete_id === null) {
            return res.status(400).json({ error: "CEP de destino e opção de frete são obrigatórios." });
        }

        // Recalcula o frete no servidor — nunca confiar no preço enviado pelo cliente.
        const carrinhoFrete = carrinho.map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade }));
        const cotacaoFrete = await calcularOpcoesFrete(carrinhoFrete, cep_destino);
        const opcaoFrete = cotacaoFrete.opcoes_frete.find(op => String(op.id) === String(frete_id));

        if (!opcaoFrete) {
            return res.status(400).json({ error: "Opção de frete inválida ou expirada. Recalcule o frete e tente novamente." });
        }

        const valor_frete = opcaoFrete.preco;

        await client.query('BEGIN');

        let totalProdutos = 0;
        const itensProcessados = [];
        const nomesProdutos = [];

        for (let item of carrinho) {
            const resProduto = await client.query(
                'SELECT nome, preco, estoque FROM produtos WHERE id = $1 FOR UPDATE',
                [item.produto_id]
            );

            if (resProduto.rows.length === 0) {
                throw new Error(`Produto ID ${item.produto_id} não encontrado.`);
            }

            const produtoDb = resProduto.rows[0];

            if (produtoDb.estoque < item.quantidade) {
                throw new Error(`Estoque insuficiente para "${produtoDb.nome}".`);
            }

            await client.query(
                'UPDATE produtos SET estoque = estoque - $1 WHERE id = $2',
                [item.quantidade, item.produto_id]
            );

            const precoSubtotal = produtoDb.preco * item.quantidade;
            totalProdutos += precoSubtotal;
            nomesProdutos.push(produtoDb.nome);

            itensProcessados.push({
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: produtoDb.preco
            });
        }

        const totalGeral = totalProdutos + valor_frete;

        const resPedido = await client.query(
            `INSERT INTO pedidos (usuario_id, cliente_nome, cliente_endereco, total, frete, caixa_sugerida, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pendente') RETURNING id`,
            [req.user.id, req.user.nome || "Cliente", endereco_entrega, totalGeral, valor_frete, opcaoFrete.caixa_sugerida ? JSON.stringify(opcaoFrete.caixa_sugerida) : null]
        );

        const pedidoId = resPedido.rows[0].id;
        const externalRef = `PEDIDO-${pedidoId}`;

        for (let item of itensProcessados) {
            await client.query(
                `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [pedidoId, item.produto_id, item.quantidade, item.preco_unitario]
            );
        }

        const descricaoPedido = nomesProdutos.join(', ').substring(0, 200) || 'Pedido Sabonetes';
        const emailPagador = email_pagador || req.user.email || 'cliente@email.com';

        const pixData = await createPixPayment({
            amount: totalGeral,
            description: descricaoPedido,
            payerEmail: emailPagador,
            payerName: req.user.nome || 'Cliente',
            externalRef: externalRef,
        });

        await client.query(
            'UPDATE pedidos SET txid = $1, mp_payment_id = $2 WHERE id = $3',
            [externalRef, String(pixData.payment_id), pedidoId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: "Pedido criado com sucesso!",
            pedido_id: pedidoId,
            total: totalGeral,
            pix_copia_cola: pixData.qr_code,
            pix_qr_code_base64: pixData.qr_code_base64,
            mp_payment_id: pixData.payment_id,
            txid: externalRef,
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro na criação do pedido:", error.message);
        res.status(400).json({ error: error.message || "Erro ao processar o pedido." });
    } finally {
        client.release();
    }
});

// ── Confirmar Pagamento (Admin) ───────────────────────────────────────────────
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

// ── Marcar como Enviado + enviar e-mail pro cliente (Admin) ──────────────────
router.patch('/:id/envio', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { codigo_rastreio } = req.body;

        // Busca pedido + e-mail do cliente + itens
        const pedidoRes = await db.query(`
            SELECT p.*, u.email as email_cliente, u.nome as nome_cliente
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = $1
        `, [id]);

        if (pedidoRes.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const pedido = pedidoRes.rows[0];

        // Atualiza status e código de rastreio
        await db.query(
            "UPDATE pedidos SET status = 'enviado', codigo_rastreio = $1 WHERE id = $2",
            [codigo_rastreio || null, id]
        );

        // Busca itens pra incluir no e-mail
        const itensRes = await db.query(`
            SELECT pi.quantidade, pi.preco_unitario, pr.nome
            FROM pedido_itens pi
            LEFT JOIN produtos pr ON pi.produto_id = pr.id
            WHERE pi.pedido_id = $1
        `, [id]);

        // Envia e-mail pro cliente (não bloqueia a resposta se falhar)
        enviarEmailEnvio({
            nomeCliente: pedido.nome_cliente || pedido.cliente_nome || 'Cliente',
            emailCliente: pedido.email_cliente,
            pedidoId: id,
            codigoRastreio: codigo_rastreio,
            itens: itensRes.rows,
            total: pedido.total,
        }).catch(err => console.error('[EMAIL] Erro assíncrono:', err.message));

        res.json({
            message: `Pedido #${id} marcado como enviado!`,
            codigo_rastreio: codigo_rastreio || null,
            email_enviado: !!pedido.email_cliente,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao atualizar envio do pedido." });
    }
});

// ── Cancelar Pedido Próprio (Cliente) — só permitido antes do pagamento ──────
// Sem pagamento aprovado ainda, cancelar é só devolver o estoque, sem reembolso
// envolvido. Depois de pago, o cliente precisa falar com a loja (ver rota de
// reembolso abaixo, que é de uso exclusivo da administradora).
router.patch('/:id/cancelar', authenticateToken, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const pedidoRes = await client.query(
            'SELECT * FROM pedidos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
            [id, req.user.id]
        );

        if (pedidoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const pedido = pedidoRes.rows[0];

        if (pedido.status !== 'pendente') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: pedido.status === 'pago'
                    ? "Esse pedido já foi pago. Entre em contato com a loja para solicitar reembolso."
                    : "Esse pedido não pode mais ser cancelado."
            });
        }

        await client.query("UPDATE pedidos SET status = 'cancelado' WHERE id = $1", [id]);
        await client.query(`
            UPDATE produtos pr
            SET estoque = estoque + pi.quantidade
            FROM pedido_itens pi
            WHERE pi.pedido_id = $1 AND pi.produto_id = pr.id
        `, [id]);

        await client.query('COMMIT');
        res.json({ message: "Pedido cancelado." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao cancelar pedido:", error.message);
        res.status(500).json({ error: "Erro ao cancelar pedido." });
    } finally {
        client.release();
    }
});

// ── Cancelar e Reembolsar Pedido Pago (Admin) ─────────────────────────────────
// Emite reembolso total via Mercado Pago, devolve o estoque e marca o pedido
// como cancelado. Só funciona pra pedidos com status 'pago' e mp_payment_id.
router.patch('/:id/reembolsar', authenticateToken, requireAdmin, async (req, res) => {
    const client = await db.connect();
    try {
        const { id } = req.params;

        const pedidoRes = await client.query('SELECT * FROM pedidos WHERE id = $1', [id]);
        if (pedidoRes.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const pedido = pedidoRes.rows[0];

        if (pedido.status !== 'pago') {
            return res.status(400).json({ error: "Só é possível reembolsar pedidos com status 'pago'." });
        }
        if (!pedido.mp_payment_id) {
            return res.status(400).json({ error: "Esse pedido não tem um pagamento do Mercado Pago associado." });
        }

        // Chama a API do Mercado Pago ANTES de tocar no banco — se o reembolso
        // falhar lá (ex: prazo de reembolso expirado), não queremos ter
        // devolvido o estoque e cancelado o pedido só pra descobrir depois
        // que o dinheiro não voltou pro cliente.
        try {
            await refundPayment(pedido.mp_payment_id);
        } catch (mpError) {
            console.error('[REEMBOLSO] Erro na API do Mercado Pago:', mpError.message);
            return res.status(502).json({
                error: "Não foi possível processar o reembolso no Mercado Pago. Verifique o pagamento diretamente no painel do Mercado Pago.",
                detalhe: mpError.message,
            });
        }

        await client.query('BEGIN');
        await client.query("UPDATE pedidos SET status = 'cancelado' WHERE id = $1", [id]);
        await client.query(`
            UPDATE produtos pr
            SET estoque = estoque + pi.quantidade
            FROM pedido_itens pi
            WHERE pi.pedido_id = $1 AND pi.produto_id = pr.id
        `, [id]);
        await client.query('COMMIT');

        res.json({ message: "Pedido reembolsado e cancelado com sucesso." });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Erro ao reembolsar pedido:", error.message);
        res.status(500).json({ error: "Erro ao reembolsar pedido." });
    } finally {
        client.release();
    }
});

// ── Consultar status PIX de um pedido (Cliente) ──────────────────────────────
router.get('/:id/pix-status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT mp_payment_id, status FROM pedidos WHERE id = $1 AND usuario_id = $2',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Pedido não encontrado." });
        }

        const pedido = result.rows[0];

        if (!pedido.mp_payment_id) {
            return res.json({ status: pedido.status, mp_status: null });
        }

        const mpStatus = await getPixPaymentStatus(pedido.mp_payment_id);

        res.json({
            pedido_status: pedido.status,
            mp_status: mpStatus.status,
            mp_status_detail: mpStatus.status_detail,
        });

    } catch (error) {
        console.error("Erro ao consultar status PIX:", error.message);
        res.status(500).json({ error: "Erro ao consultar status do pagamento." });
    }
});

module.exports = router;
