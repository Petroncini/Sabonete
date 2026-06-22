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
const shippingRoutes = require('./routes/shipping');
const webhookRoutes = require('./routes/webhook');

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

// Servir o Frontend (HTML, CSS, JS)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
