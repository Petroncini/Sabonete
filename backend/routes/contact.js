const express = require('express');
const { enviarEmailContatoSite } = require('../utils/email');
const router = express.Router();

router.post('/', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    try {
        const result = await enviarEmailContatoSite({
            nomeCliente: name,
            emailCliente: email,
            mensagem: message
        });

        if (result.success) {
            res.json({ success: true });
        } else {
            console.error('[CONTATO] Erro ao enviar e-mail:', result.error || result.reason);
            res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
        }
    } catch (err) {
        console.error('[CONTATO] Erro:', err);
        res.status(500).json({ error: 'Erro ao enviar a mensagem.' });
    }
});

module.exports = router;
