const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Registro de Usuário (Cliente)
router.post('/register', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({ error: "Preencha todos os campos." });
        }

        // Verifica se usuário já existe
        const userExists = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: "E-mail já cadastrado." });
        }

        // Hash e Salting da senha
        const saltRounds = 10;
        const senhaHash = await bcrypt.hash(senha, saltRounds);

        // O primeiro usuário a se registrar será admin para facilitar nossos testes
        const isFirstUser = (await db.query('SELECT COUNT(*) FROM usuarios')).rows[0].count === '0';
        const role = isFirstUser ? 'admin' : 'cliente';

        const newUser = await db.query(
            'INSERT INTO usuarios (nome, email, senha_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role',
            [nome, email, senhaHash, role]
        );

        res.status(201).json({ message: "Usuário registrado com sucesso!", user: newUser.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao registrar usuário." });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Credenciais inválidas." });
        }

        const user = result.rows[0];

        const validPassword = await bcrypt.compare(senha, user.senha_hash);
        if (!validPassword) {
            return res.status(400).json({ error: "Credenciais inválidas." });
        }

        // Gerar Token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: "Login bem sucedido!",
            token,
            user: { id: user.id, nome: user.nome, email: user.email, role: user.role }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao realizar login." });
    }
});

module.exports = router;
