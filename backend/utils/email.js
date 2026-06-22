// Utilitário de envio de e-mail via Resend
// Documentação: https://resend.com/docs
// Plano gratuito: 3.000 e-mails/mês
//
// Para configurar:
// 1. Crie uma conta em resend.com
// 2. Gere uma API Key
// 3. Adicione RESEND_API_KEY no .env
// 4. Configure um domínio remetente (ou use o domínio de teste do Resend)

const { Resend } = require('resend');

const getResend = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'sua_api_key_aqui') return null;
    return new Resend(apiKey);
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'Ateliê Camila <noreply@resend.dev>';
const STORE_NAME = process.env.STORE_NAME || 'Ateliê Camila Petroncini';

/**
 * Envia e-mail de confirmação de envio do pedido para o cliente.
 */
async function enviarEmailEnvio({ nomeCliente, emailCliente, pedidoId, codigoRastreio, itens, total }) {
    const resend = getResend();

    if (!resend) {
        console.warn('[EMAIL] RESEND_API_KEY não configurado — e-mail não enviado.');
        return { success: false, reason: 'sem_config' };
    }

    if (!emailCliente) {
        console.warn(`[EMAIL] Pedido #${pedidoId} sem e-mail do cliente — e-mail não enviado.`);
        return { success: false, reason: 'sem_email' };
    }

    const itensHtml = itens.map(item => `
        <tr>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7;">${item.nome || 'Produto'}</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7; text-align:center;">${item.quantidade}</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7; text-align:right;">R$ ${parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}</td>
        </tr>
    `).join('');

    const rastreioHtml = codigoRastreio ? `
        <div style="background:#f3ede7; border-radius:8px; padding:16px; margin:24px 0; text-align:center;">
            <p style="margin:0 0 8px; color:#5c3d2e; font-size:14px;">Código de Rastreio</p>
            <p style="margin:0; font-size:22px; font-weight:bold; color:#c8977a; letter-spacing:2px;">${codigoRastreio}</p>
            <p style="margin:8px 0 0; color:#888; font-size:12px;">
                Acompanhe sua encomenda em 
                <a href="https://rastreamento.correios.com.br/app/index.php" style="color:#c8977a;">rastreamento.correios.com.br</a>
            </p>
        </div>
    ` : '';

    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#faf5ef;font-family:'Helvetica Neue',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#c8977a,#a8866b);padding:32px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:24px;font-weight:300;letter-spacing:1px;">${STORE_NAME}</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">🚀 Seu pedido foi enviado!</p>
            </div>

            <!-- Body -->
            <div style="padding:32px;">
                <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
                <p style="color:#666;line-height:1.6;">Boa notícia! Seu pedido <strong>#${pedidoId}</strong> foi preparado com todo carinho e já está a caminho.</p>

                ${rastreioHtml}

                <!-- Itens -->
                <table style="width:100%;border-collapse:collapse;margin:24px 0;">
                    <thead>
                        <tr style="background:#faf5ef;">
                            <th style="padding:10px 16px;text-align:left;color:#5c3d2e;font-size:13px;font-weight:600;">Produto</th>
                            <th style="padding:10px 16px;text-align:center;color:#5c3d2e;font-size:13px;font-weight:600;">Qtd</th>
                            <th style="padding:10px 16px;text-align:right;color:#5c3d2e;font-size:13px;font-weight:600;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>${itensHtml}</tbody>
                    <tfoot>
                        <tr>
                            <td colspan="2" style="padding:12px 16px;font-weight:bold;color:#5c3d2e;">Total</td>
                            <td style="padding:12px 16px;font-weight:bold;color:#c8977a;text-align:right;">R$ ${parseFloat(total).toFixed(2).replace('.', ',')}</td>
                        </tr>
                    </tfoot>
                </table>

                <p style="color:#666;font-size:14px;line-height:1.6;">Qualquer dúvida, é só responder este e-mail. 💛</p>
                <p style="color:#666;font-size:14px;">Com carinho,<br><strong style="color:#c8977a;">${STORE_NAME}</strong></p>
            </div>

            <!-- Footer -->
            <div style="background:#faf5ef;padding:16px;text-align:center;border-top:1px solid #f0e8e0;">
                <p style="margin:0;color:#aaa;font-size:12px;">Sabonetes artesanais feitos com amor 🌸</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [emailCliente],
            subject: `🚀 Pedido #${pedidoId} enviado! ${codigoRastreio ? `— Rastreio: ${codigoRastreio}` : ''}`,
            html,
        });

        if (error) {
            console.error(`[EMAIL] Erro ao enviar para ${emailCliente}:`, error);
            return { success: false, error };
        }

        console.log(`[EMAIL] ✅ E-mail de envio enviado para ${emailCliente} — ID: ${data?.id}`);
        return { success: true, id: data?.id };
    } catch (err) {
        console.error('[EMAIL] Exceção ao enviar e-mail:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { enviarEmailEnvio };
