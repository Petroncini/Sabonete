const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

    if (!token) return res.status(401).json({ error: "Token de autenticação não fornecido" });

    jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura_aqui', (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido ou expirado" });
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
