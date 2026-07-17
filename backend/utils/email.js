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
 * Layout base compartilhado por todos os e-mails da loja — evita duplicar o
 * wrapper HTML/CSS em cada tipo de notificação.
 */
function renderLayout({ headerEmoji, headerTitulo, corpoHtml }) {
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#faf5ef;font-family:'Helvetica Neue',Arial,sans-serif;">
        <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:linear-gradient(135deg,#c8977a,#a8866b);padding:32px;text-align:center;">
                <h1 style="margin:0;color:#fff;font-size:24px;font-weight:300;letter-spacing:1px;">${STORE_NAME}</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">${headerEmoji} ${headerTitulo}</p>
            </div>
            <div style="padding:32px;">
                ${corpoHtml}
                <p style="color:#666;font-size:14px;line-height:1.6;margin-top:24px;">Qualquer dúvida, é só responder este e-mail. 💛</p>
                <p style="color:#666;font-size:14px;">Com carinho,<br><strong style="color:#c8977a;">${STORE_NAME}</strong></p>
            </div>
            <div style="background:#faf5ef;padding:16px;text-align:center;border-top:1px solid #f0e8e0;">
                <p style="margin:0;color:#aaa;font-size:12px;">Sabonetes artesanais feitos com amor 🌸</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function renderTabelaItens(itens, total) {
    const itensHtml = (itens || []).map(item => `
        <tr>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7;">${item.nome || 'Produto'}</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7; text-align:center;">${item.quantidade}</td>
            <td style="padding: 8px 16px; border-bottom: 1px solid #f3ede7; text-align:right;">R$ ${parseFloat(item.preco_unitario).toFixed(2).replace('.', ',')}</td>
        </tr>
    `).join('');

    return `
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
    `;
}

/**
 * Envia um e-mail genérico via Resend, com as checagens de configuração
 * compartilhadas por todas as notificações da loja.
 */
async function enviarEmail({ emailCliente, assunto, html, logContexto }) {
    const resend = getResend();

    if (!resend) {
        console.warn(`[EMAIL] RESEND_API_KEY não configurado — e-mail (${logContexto}) não enviado.`);
        return { success: false, reason: 'sem_config' };
    }
    if (!emailCliente) {
        console.warn(`[EMAIL] ${logContexto} sem e-mail do cliente — e-mail não enviado.`);
        return { success: false, reason: 'sem_email' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [emailCliente],
            subject: assunto,
            html,
        });

        if (error) {
            console.error(`[EMAIL] Erro ao enviar (${logContexto}) para ${emailCliente}:`, error);
            return { success: false, error };
        }

        console.log(`[EMAIL] ✅ (${logContexto}) enviado para ${emailCliente} — ID: ${data?.id}`);
        return { success: true, id: data?.id };
    } catch (err) {
        console.error(`[EMAIL] Exceção ao enviar (${logContexto}):`, err.message);
        return { success: false, error: err.message };
    }
}

/**
 * E-mail de boas-vindas ao se cadastrar.
 */
async function enviarEmailBoasVindas({ nomeCliente, emailCliente }) {
    const html = renderLayout({
        headerEmoji: '🌸',
        headerTitulo: 'Seja bem-vinda(o)!',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="color:#666;line-height:1.6;">Sua conta foi criada com sucesso. Agora você já pode explorar nossos sabonetes artesanais e acompanhar seus pedidos por aqui.</p>
        `,
    });

    return enviarEmail({
        emailCliente,
        assunto: `🌸 Bem-vinda(o) à ${STORE_NAME}!`,
        html,
        logContexto: 'boas-vindas',
    });
}

/**
 * E-mail de confirmação de pagamento.
 */
async function enviarEmailPagamentoConfirmado({ nomeCliente, emailCliente, pedidoId, itens, total }) {
    const html = renderLayout({
        headerEmoji: '✅',
        headerTitulo: 'Pagamento confirmado!',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="color:#666;line-height:1.6;">Recebemos seu pagamento do pedido <strong>#${pedidoId}</strong>. Já vamos começar a preparar tudo com carinho!</p>
            ${renderTabelaItens(itens, total)}
        `,
    });

    return enviarEmail({
        emailCliente,
        assunto: `✅ Pagamento do pedido #${pedidoId} confirmado!`,
        html,
        logContexto: `pagamento-confirmado #${pedidoId}`,
    });
}

/**
 * E-mail de confirmação de envio do pedido.
 */
async function enviarEmailEnvio({ nomeCliente, emailCliente, pedidoId, codigoRastreio, itens, total }) {
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

    const html = renderLayout({
        headerEmoji: '🚀',
        headerTitulo: 'Seu pedido foi enviado!',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="color:#666;line-height:1.6;">Boa notícia! Seu pedido <strong>#${pedidoId}</strong> foi preparado com todo carinho e já está a caminho.</p>
            ${rastreioHtml}
            ${renderTabelaItens(itens, total)}
        `,
    });

    return enviarEmail({
        emailCliente,
        assunto: `🚀 Pedido #${pedidoId} enviado! ${codigoRastreio ? `— Rastreio: ${codigoRastreio}` : ''}`,
        html,
        logContexto: `envio #${pedidoId}`,
    });
}

/**
 * E-mail de pedido cancelado (sem reembolso, ex: cancelado antes de pagar).
 */
async function enviarEmailCancelado({ nomeCliente, emailCliente, pedidoId }) {
    const html = renderLayout({
        headerEmoji: '❌',
        headerTitulo: 'Pedido cancelado',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="color:#666;line-height:1.6;">Seu pedido <strong>#${pedidoId}</strong> foi cancelado. Se isso foi um engano ou você quiser fazer um novo pedido, é só voltar à loja quando quiser.</p>
        `,
    });

    return enviarEmail({
        emailCliente,
        assunto: `❌ Pedido #${pedidoId} cancelado`,
        html,
        logContexto: `cancelado #${pedidoId}`,
    });
}

/**
 * E-mail de reembolso processado.
 */
async function enviarEmailReembolso({ nomeCliente, emailCliente, pedidoId, total }) {
    const html = renderLayout({
        headerEmoji: '↩️',
        headerTitulo: 'Reembolso processado',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Olá, <strong>${nomeCliente}</strong>!</p>
            <p style="color:#666;line-height:1.6;">O reembolso do seu pedido <strong>#${pedidoId}</strong>, no valor de <strong>R$ ${parseFloat(total).toFixed(2).replace('.', ',')}</strong>, foi processado pelo Mercado Pago. O prazo para o valor aparecer na sua conta pode variar de acordo com seu banco.</p>
        `,
    });

    return enviarEmail({
        emailCliente,
        assunto: `↩️ Reembolso do pedido #${pedidoId} processado`,
        html,
        logContexto: `reembolso #${pedidoId}`,
    });
}

/**
 * E-mail de contato recebido pelo site (enviado PARA a loja).
 */
async function enviarEmailContatoSite({ nomeCliente, emailCliente, mensagem }) {
    const html = renderLayout({
        headerEmoji: '💬',
        headerTitulo: 'Nova Mensagem pelo Site',
        corpoHtml: `
            <p style="color:#5c3d2e;font-size:16px;">Você recebeu um novo contato.</p>
            <p><strong>Nome:</strong> ${nomeCliente}</p>
            <p><strong>E-mail:</strong> ${emailCliente}</p>
            <p><strong>Mensagem:</strong></p>
            <div style="background:#f3ede7; border-radius:8px; padding:16px; color:#666; white-space:pre-wrap;">${mensagem}</div>
        `,
    });

    const resend = getResend();
    if (!resend) return { success: false, reason: 'sem_config' };
    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: ['contato@ateliecamilapetroncini.com.br'],
            replyTo: emailCliente,
            subject: `💬 Novo contato pelo site: ${nomeCliente}`,
            html,
        });
        if (error) return { success: false, error };
        return { success: true, id: data?.id };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    enviarEmailContatoSite,
    enviarEmailBoasVindas,
    enviarEmailPagamentoConfirmado,
    enviarEmailEnvio,
    enviarEmailCancelado,
    enviarEmailReembolso,
};
