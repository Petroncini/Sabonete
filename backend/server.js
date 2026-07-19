const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Importação das Rotas
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const shippingRoutes = require('./routes/shipping').router;
const webhookRoutes = require('./routes/webhook');
const tagsRoutes = require('./routes/tags');
const contactRoutes = require('./routes/contact');

// Endpoint de teste de saúde (Ping)
app.get('/api/ping', (req, res) => {
    res.json({ message: "Servidor online e rodando!" });
});

// Registro de Rotas na API
app.use('/api/auth', authRoutes);
app.use('/api/produtos', productsRoutes);
app.use('/api/pedidos', ordersRoutes);
app.use('/api/frete', shippingRoutes);
app.use('/api/webhook', webhookRoutes); // Público: recebe notificações do MercadoPago
app.use('/api/tags', tagsRoutes);
app.use('/api/contato', contactRoutes);

// Servir o Frontend (HTML, CSS, JS)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

// Rotas limpas (sem .html na URL)
const root = path.join(__dirname, '../');
app.get('/',              (req, res) => res.redirect('/home'));
app.get('/home',          (req, res) => res.sendFile('index.html',        { root }));
app.get('/carrinho',      (req, res) => res.sendFile('carrinho.html',     { root }));
app.get('/checkout',      (req, res) => res.sendFile('checkout.html',     { root }));
app.get('/login',         (req, res) => res.sendFile('login.html',        { root }));
app.get('/backoffice',    (req, res) => res.sendFile('backoffice.html',   { root }));
app.get('/meus-pedidos',  (req, res) => res.sendFile('meus-pedidos.html', { root }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
