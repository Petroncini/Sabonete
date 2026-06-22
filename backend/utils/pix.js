// Utilitário de PIX via MercadoPago SDK
// Substitui o gerador local de BR Code pela API oficial do Mercado Pago

const { MercadoPagoConfig, Payment, PaymentRefund } = require('mercadopago');

// Inicializa o cliente com o Access Token de ambiente
const getMercadoPagoClient = () => {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('MP_ACCESS_TOKEN não configurado no .env');
    }
    return new MercadoPagoConfig({ accessToken });
};

/**
 * Cria um pagamento PIX via Mercado Pago e retorna os dados do QR code.
 *
 * @param {object} params
 * @param {number} params.amount       - Valor total do pagamento (ex: 59.90)
 * @param {string} params.description  - Descrição do pedido
 * @param {string} params.payerEmail   - E-mail do comprador
 * @param {string} params.payerName    - Nome do comprador
 * @param {string} params.externalRef  - Referência única (ex: "PEDIDO-42")
 *
 * @returns {Promise<{
 *   payment_id: number,
 *   qr_code: string,       // Copia e cola
 *   qr_code_base64: string // Imagem do QR code em Base64
 * }>}
 */
async function createPixPayment({ amount, description, payerEmail, payerName, externalRef }) {
    const client = getMercadoPagoClient();
    const paymentApi = new Payment(client);

    // Sem expiração definida, um QR code abandonado pode ficar "pendente" pra sempre,
    // travando o estoque reservado e nunca disparando webhook de cancelamento.
    const dataExpiracao = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const result = await paymentApi.create({
        body: {
            transaction_amount: Number(amount),
            description: description,
            payment_method_id: 'pix',
            external_reference: externalRef,
            notification_url: process.env.MP_WEBHOOK_URL || undefined,
            date_of_expiration: dataExpiracao,
            payer: {
                email: payerEmail,
                first_name: payerName ? payerName.split(' ')[0] : 'Cliente',
                last_name: payerName ? payerName.split(' ').slice(1).join(' ') : '',
            },
        },
    });

    const poi = result.point_of_interaction?.transaction_data;

    if (!poi?.qr_code) {
        throw new Error('MercadoPago não retornou os dados do QR code PIX.');
    }

    return {
        payment_id: result.id,
        status: result.status,
        qr_code: poi.qr_code,           // Copia e cola (texto)
        qr_code_base64: poi.qr_code_base64, // Imagem PNG em Base64
    };
}

/**
 * Consulta o status de um pagamento pelo ID.
 *
 * @param {number|string} paymentId
 * @returns {Promise<{ id: number, status: string, status_detail: string }>}
 */
async function getPixPaymentStatus(paymentId) {
    const client = getMercadoPagoClient();
    const paymentApi = new Payment(client);
    const result = await paymentApi.get({ id: paymentId });
    return {
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
    };
}

/**
 * Reembolsa (total) um pagamento já aprovado via Mercado Pago.
 *
 * @param {number|string} paymentId
 * @returns {Promise<{ id: number, status: string }>}
 */
async function refundPayment(paymentId) {
    const client = getMercadoPagoClient();
    const refundApi = new PaymentRefund(client);
    const result = await refundApi.total({ payment_id: paymentId });
    return {
        id: result.id,
        status: result.status,
    };
}

module.exports = { createPixPayment, getPixPaymentStatus, refundPayment };
