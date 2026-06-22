const jwt = require('jsonwebtoken');
const db = require('../db');

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET não configurado. Defina essa variável de ambiente antes de iniciar o servidor.');
}

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

    if (!token) return res.status(401).json({ error: "Token de autenticação não fornecido" });

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido ou expirado" });

        // O token pode ser válido (assinatura ok) mas referenciar um usuário que não
        // existe mais (ex: banco resetado em dev, ou conta deletada) — sem essa checagem,
        // requisições autenticadas explodiriam com erros de foreign key lá na frente.
        try {
            const { rows } = await db.query('SELECT id FROM usuarios WHERE id = $1', [user.id]);
            if (rows.length === 0) {
                return res.status(401).json({ error: "SESSAO_INVALIDA", message: "Sua sessão expirou. Faça login novamente." });
            }
        } catch (dbErr) {
            console.error('[AUTH] Erro ao validar usuário do token:', dbErr.message);
            return res.status(500).json({ error: "Erro ao validar sessão." });
        }

        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
    }
};

module.exports = { authenticateToken, requireAdmin };
