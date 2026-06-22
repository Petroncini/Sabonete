// Rota de cálculo de frete — integração real com a API da SuperFrete
// Documentação: https://superfrete.readme.io/reference/cotacao-de-frete
//
// Lógica de cubagem:
//  - Peso total = soma(peso_gramas * qty) + 150g de embalagem, convertido para kg
//  - Enviamos PRODUTOS INDIVIDUAIS para a API → ela calcula a caixa ideal automaticamente
//  - A API retorna as dimensões da caixa ideal, que devemos usar na etiqueta futuramente
//
// A SuperFrete suporta dois ambientes:
//   Sandbox:   https://sandbox.superfrete.com/api/v0/calculator
//   Produção:  https://api.superfrete.com/api/v0/calculator

const express = require('express');
const axios = require('axios');
const db = require('../db');
const router = express.Router();

// ============================================================
// Configuração da API SuperFrete
// ============================================================
const SF_PROD_URL  = 'https://api.superfrete.com/api/v0/calculator';
const SF_SAND_URL  = 'https://sandbox.superfrete.com/api/v0/calculator';

// Use sandbox enquanto SUPER_FRETE_ENV não for "production"
const getSuperFreteUrl = () =>
    process.env.SUPER_FRETE_ENV === 'production' ? SF_PROD_URL : SF_SAND_URL;

// ============================================================
// Lógica de embalagem — seleção da caixa padrão dos Correios
// ============================================================
// Dimensões das caixas padrão dos Correios (cm)
// Fonte: https://www.correios.com.br/enviar/embalagens/caixas
const CAIXAS_CORREIOS = [
    { nome: 'Correios 1 (11×11×6)',  comprimento: 11, largura: 11, altura: 6,  volumeMax: 726 },
    { nome: 'Correios 2 (16×11×6)',  comprimento: 16, largura: 11, altura: 6,  volumeMax: 1056 },
    { nome: 'Correios 3 (16×11×11)', comprimento: 16, largura: 11, altura: 11, volumeMax: 1936 },
    { nome: 'Correios 4 (20×15×11)', comprimento: 20, largura: 15, altura: 11, volumeMax: 3300 },
    { nome: 'Correios 5 (24×17×11)', comprimento: 24, largura: 17, altura: 11, volumeMax: 4488 },
    { nome: 'Correios 6 (28×20×16)', comprimento: 28, largura: 20, altura: 16, volumeMax: 8960 },
    { nome: 'Correios 7 (34×22×20)', comprimento: 34, largura: 22, altura: 20, volumeMax: 14960 },
];

/**
 * Seleciona a menor caixa dos Correios que caiba o volume dado.
 * Aplica 30% de margem de folga pra garantir que os sabonetes entrem.
 * Se for maior que a maior caixa, retorna a maior.
 */
function selecionarCaixa(volumeTotalCm3) {
    const volumeComFolga = Math.ceil(volumeTotalCm3 * 1.30);

    for (const caixa of CAIXAS_CORREIOS) {
        if (volumeComFolga <= caixa.volumeMax) {
            return { ...caixa, volumeUsado: volumeComFolga };
        }
    }
    // Pedido maior que qualquer caixa padrão — retorna a maior
    return { ...CAIXAS_CORREIOS[CAIXAS_CORREIOS.length - 1], volumeUsado: volumeComFolga };
}

// ============================================================
// Lógica de cálculo de frete — reutilizável por outras rotas (ex: orders.js)
// Lança erro com .status definido para ser tratado pelo handler HTTP.
// ============================================================
async function calcularOpcoesFrete(carrinho, cep_destino) {
        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            const err = new Error('Carrinho inválido ou vazio.');
            err.status = 400;
            throw err;
        }
        if (!cep_destino) {
            const err = new Error('CEP de destino obrigatório.');
            err.status = 400;
            throw err;
        }

        // Limpa CEP (remove hífen)
        const cepDestino = cep_destino.replace(/\D/g, '');
        const cepOrigem  = (process.env.CEP_ORIGEM || '01001000').replace(/\D/g, '');

        // ── 1. Busca dimensões reais dos produtos no banco ─────────────────
        const ids = carrinho.map(i => i.produto_id);
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const { rows: produtos } = await db.query(
            `SELECT id, nome, peso_gramas, comprimento_cm, largura_cm, altura_cm
             FROM produtos WHERE id IN (${placeholders})`,
            ids
        );

        if (produtos.length === 0) {
            const err = new Error('Nenhum produto encontrado.');
            err.status = 400;
            throw err;
        }

        // ── 2. Monta arrays para cálculo ───────────────────────────────────
        let pesoTotalGramas = 150; // tara da embalagem (papelão + proteção)
        let volumeTotalCm3  = 0;
        const produtosParaApi = [];

        for (const item of carrinho) {
            const prod = produtos.find(p => p.id === item.produto_id);
            if (!prod) continue;

            const qty = item.quantidade || 1;
            pesoTotalGramas += prod.peso_gramas * qty;
            volumeTotalCm3  += prod.comprimento_cm * prod.largura_cm * prod.altura_cm * qty;

            produtosParaApi.push({
                quantity: qty,
                weight:   parseFloat((prod.peso_gramas / 1000).toFixed(3)), // g → kg
                height:   prod.altura_cm,
                width:    prod.largura_cm,
                length:   prod.comprimento_cm,
            });
        }

        const pesoTotalKg = parseFloat((pesoTotalGramas / 1000).toFixed(3));
        const caixaSugerida = selecionarCaixa(volumeTotalCm3);

        // ── 3. Chama a API da SuperFrete ───────────────────────────────────
        const superFreteToken = process.env.SUPER_FRETE_TOKEN;

        if (!superFreteToken || superFreteToken === 'seu_token_aqui') {
            // Sem token configurado → retorna estimativa local (para dev)
            console.warn('[FRETE] SUPER_FRETE_TOKEN não configurado — retornando estimativa local.');
            return {
                sucesso: true,
                modo: 'estimativa_local',
                aviso: 'Configure SUPER_FRETE_TOKEN no .env para cotações reais.',
                pesoEstimadoKg: pesoTotalKg,
                caixaSugerida,
                opcoes_frete: [
                    { id: 1, nome: 'PAC',   preco: 18.50, preco_formatted: 'R$ 18,50', prazo: '5 a 7 dias úteis', transportadora: 'Correios' },
                    { id: 2, nome: 'SEDEX', preco: 32.00, preco_formatted: 'R$ 32,00', prazo: '1 a 2 dias úteis', transportadora: 'Correios' },
                ],
            };
        }

        const sfUrl = getSuperFreteUrl();
        const sfBody = {
            from: { postal_code: cepOrigem },
            to:   { postal_code: cepDestino },
            services: '1,2,17', // PAC, SEDEX, Mini Envios
            options: {
                own_hand:           false,
                receipt:            false,
                insurance_value:    0,
                use_insurance_value: false,
            },
            products: produtosParaApi,
        };

        const sfResponse = await axios.post(sfUrl, sfBody, {
            headers: {
                Authorization: `Bearer ${superFreteToken}`,
                'Content-Type': 'application/json',
                Accept:         'application/json',
                'User-Agent':   `Atelier-Sabonetes/1.0 (${process.env.MP_WEBHOOK_URL || 'contato@sabonetes.com'})`,
            },
            timeout: 8000,
        });

        // A API retorna um array de cotações
        const cotacoes = sfResponse.data;

        // Filtra apenas serviços sem erro e disponíveis
        const opcoesDisponiveis = (Array.isArray(cotacoes) ? cotacoes : [])
            .filter(c => !c.error && c.price && c.delivery_time)
            .map(c => ({
                id:              c.id,
                nome:            c.name,
                transportadora:  c.company?.name || 'Transportadora',
                preco:           parseFloat(c.price),
                preco_formatted: `R$ ${parseFloat(c.price).toFixed(2).replace('.', ',')}`,
                prazo:           `${c.delivery_time} dia${c.delivery_time > 1 ? 's' : ''} útil${c.delivery_time > 1 ? 'eis' : ''}`,
                caixa_sugerida:  c.packages?.[0] ? {
                    comprimento: c.packages[0].dimensions?.length,
                    largura:     c.packages[0].dimensions?.width,
                    altura:      c.packages[0].dimensions?.height,
                    peso:        c.packages[0].weight,
                } : caixaSugerida,
            }));

        return {
            sucesso: true,
            modo: 'superfrete',
            pesoEstimadoKg: pesoTotalKg,
            caixaSugerida,
            opcoes_frete: opcoesDisponiveis.length > 0
                ? opcoesDisponiveis
                : [{ nome: 'Frete padrão', preco: 25.00, preco_formatted: 'R$ 25,00', prazo: 'A consultar', transportadora: 'Correios' }],
        };
}

// ============================================================
// POST /api/frete/calculate
// Body: { carrinho: [{ produto_id, quantidade }], cep_destino: "00000000" }
// ============================================================
router.post('/calculate', async (req, res) => {
    try {
        const { carrinho, cep_destino } = req.body;
        const resultado = await calcularOpcoesFrete(carrinho, cep_destino);
        res.json(resultado);
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ error: error.message });
        }
        // Trata erro da API da SuperFrete especificamente
        if (error.response) {
            console.error('[FRETE] Erro da API SuperFrete:', error.response.status, JSON.stringify(error.response.data));
            return res.status(502).json({
                error: 'Erro ao consultar transportadora. Tente novamente.',
                detalhe: error.response.data?.message || null,
            });
        }
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Timeout ao consultar o frete. Tente novamente.' });
        }
        console.error('[FRETE] Erro interno:', error.message);
        res.status(500).json({ error: 'Erro interno no cálculo de frete.' });
    }
});

module.exports = { router, calcularOpcoesFrete };
