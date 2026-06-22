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

// Servir imagens de produto enviadas via upload (precisa do mesmo UPLOAD_DIR usado em routes/products.js)
const path = require('path');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Servir o Frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
