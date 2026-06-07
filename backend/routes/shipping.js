const express = require('express');
const axios = require('axios');
const router = express.Router();

// Cadastro das caixas padrões da Camila (P, M, G)
const caixasDaCamila = [
    { nome: "Caixa P", comprimento: 16, largura: 11, altura: 6, volumeMax: 1056 },
    { nome: "Caixa M", comprimento: 20, largura: 16, altura: 11, volumeMax: 3520 },
    { nome: "Caixa G", comprimento: 28, largura: 20, altura: 16, volumeMax: 8960 }
];

router.post('/calculate', async (req, res) => {
    try {
        const { carrinho, cep_destino } = req.body; 
        
        if (!carrinho || !Array.isArray(carrinho) || carrinho.length === 0) {
            return res.status(400).json({ error: "Carrinho inválido ou vazio." });
        }

        let pesoTotal = 0;
        let volumeTotal = 0;

        carrinho.forEach(item => {
            pesoTotal += (item.peso_gramas * item.quantidade);
            let volumeDoProduto = item.comprimento_cm * item.largura_cm * item.altura_cm;
            volumeTotal += (volumeDoProduto * item.quantidade);
        });

        // Margens de segurança
        pesoTotal += 150; // Papelão e embalagem
        const volumeComFolga = volumeTotal * 1.30;

        let caixaEscolhida = null;
        for (let caixa of caixasDaCamila) {
            if (volumeComFolga <= caixa.volumeMax) {
                caixaEscolhida = caixa;
                break;
            }
        }

        if (!caixaEscolhida) {
            caixaEscolhida = caixasDaCamila[caixasDaCamila.length - 1];
        }

        // Integração com Super Frete API (Exemplo real de chamada de API Logística)
        /* 
        const superFreteToken = process.env.SUPER_FRETE_TOKEN;
        const response = await axios.post('https://www.superfrete.com/api/v1/calculator', {
            from: { postal_code: "01001000" }, // CEP da Camila
            to: { postal_code: cep_destino },
            package: {
                weight: pesoTotal / 1000, // Kg
                width: caixaEscolhida.largura,
                height: caixaEscolhida.altura,
                length: caixaEscolhida.comprimento
            }
        }, {
            headers: { Authorization: `Bearer ${superFreteToken}` }
        });
        
        return res.json(response.data);
        */

        // Como ainda não temos o token real, retornamos dados simulados com as medidas calculadas
        res.json({
            sucesso: true,
            pesoEstimadoGramas: pesoTotal,
            caixaSugerida: caixaEscolhida,
            opcoes_frete: [
                { nome: "PAC", preco: 18.50, prazo: "5 a 7 dias úteis" },
                { nome: "SEDEX", preco: 32.00, prazo: "1 a 2 dias úteis" }
            ]
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro interno no cálculo da embalagem." });
    }
});

module.exports = router;
