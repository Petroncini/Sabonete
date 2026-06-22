// Webhook do MercadoPago - Recebe notificações de pagamento PIX
// Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { getPixPaymentStatus } = require('../utils/pix');

const router = express.Router();

/**
 * Valida a assinatura do webhook enviada pelo MercadoPago.
 * Referência: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks#bookmark_validar_origem_das_notificacoes
 */
function validateMPSignature(req) {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) return true; // Pula validação se o secret não estiver configurado (dev local)

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];

    if (!xSignature || !xRequestId) return false;

    const dataId = req.query['data.id'] || req.body?.data?.id;

    // Monta a string de manifesto: "id:{dataId};request-id:{xRequestId};ts:{ts};"
    const parts = xSignature.split(',');
    const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!ts || !v1) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expectedHash = crypto
        .createHmac('sha256', secret)
        .update(manifest)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(v1));
}

/**
 * POST /api/webhook/mercadopago
 * Endpoint público que recebe as notificações do MercadoPago.
 * Deve ser acessível via URL pública (configurada em MP_WEBHOOK_URL).
 */
router.post('/mercadopago', async (req, res) => {
    // Responde 200 imediatamente para o MercadoPago não reenviar
    res.status(200).send('OK');

    try {
        const { type, action, data } = req.body;

        // Valida assinatura (recomendado em produção)
        if (!validateMPSignature(req)) {
            console.warn('[WEBHOOK] Assinatura inválida - ignorando notificação');
            return;
        }

        // O MercadoPago envia notificações do tipo "payment"
        if (type !== 'payment') {
            console.log(`[WEBHOOK] Tipo ignorado: ${type}`);
            return;
        }

        const paymentId = data?.id;
        if (!paymentId) return;

        console.log(`[WEBHOOK] Notificação de pagamento recebida - ID: ${paymentId}, ação: ${action}`);

        // Consulta o status real do pagamento na API do MercadoPago
        const mpStatus = await getPixPaymentStatus(paymentId);
        console.log(`[WEBHOOK] Status do pagamento ${paymentId}: ${mpStatus.status}`);

        // Busca o pedido associado ao payment_id
        const pedidoRes = await db.query(
            'SELECT id, status FROM pedidos WHERE mp_payment_id = $1',
            [String(paymentId)]
        );

        if (pedidoRes.rows.length === 0) {
            console.warn(`[WEBHOOK] Nenhum pedido encontrado para mp_payment_id=${paymentId}`);
            return;
        }

        const pedido = pedidoRes.rows[0];

        // Mapeia o status do MP para o status interno do pedido
        const statusMap = {
            approved: 'pago',
            cancelled: 'cancelado',
            rejected: 'cancelado',
            refunded: 'cancelado',
        };

        const novoStatus = statusMap[mpStatus.status];

        if (!novoStatus) {
            console.log(`[WEBHOOK] Status "${mpStatus.status}" não requer atualização de pedido.`);
            return;
        }

        // Evita sobrescrever um status já processado (ex: já pago)
        if (pedido.status === novoStatus) {
            console.log(`[WEBHOOK] Pedido ${pedido.id} já está com status "${novoStatus}".`);
            return;
        }

        // Se o pedido está sendo cancelado e o estoque ainda não tinha sido devolvido
        // (ou seja, ele não estava já cancelado antes), devolve as unidades reservadas.
        if (novoStatus === 'cancelado' && pedido.status !== 'cancelado') {
            const client = await db.connect();
            try {
                await client.query('BEGIN');
                await client.query(
                    'UPDATE pedidos SET status = $1 WHERE id = $2',
                    [novoStatus, pedido.id]
                );
                await client.query(`
                    UPDATE produtos pr
                    SET estoque = estoque + pi.quantidade
                    FROM pedido_itens pi
                    WHERE pi.pedido_id = $1 AND pi.produto_id = pr.id
                `, [pedido.id]);
                await client.query('COMMIT');
                console.log(`[WEBHOOK] ✅ Pedido ${pedido.id} cancelado e estoque devolvido.`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
            return;
        }

        // Atualiza o status do pedido no banco
        await db.query(
            'UPDATE pedidos SET status = $1 WHERE id = $2',
            [novoStatus, pedido.id]
        );

        console.log(`[WEBHOOK] ✅ Pedido ${pedido.id} atualizado para "${novoStatus}".`);

    } catch (error) {
        console.error('[WEBHOOK] Erro ao processar notificação:', error.message);
    }
});

module.exports = router;
