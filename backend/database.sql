-- Script de Inicialização do Banco de Dados PostgreSQL (Atualizado com Auth e Controle de Estoque)

-- Extensão para geração de UUIDs se necessário no futuro
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'cliente', -- 'cliente' ou 'admin'
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL,
    peso_gramas INTEGER NOT NULL,
    comprimento_cm INTEGER NOT NULL,
    largura_cm INTEGER NOT NULL,
    altura_cm INTEGER NOT NULL,
    estoque INTEGER DEFAULT 0 CHECK (estoque >= 0), -- Impede estoque negativo no banco
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- Se o usuário for deletado, mantemos o histórico do pedido
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_endereco TEXT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    frete DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, pago, enviado, cancelado
    txid VARCHAR(50) UNIQUE, -- O identificador do PIX
    codigo_rastreio VARCHAR(50),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedido_itens (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    produto_id INTEGER REFERENCES produtos(id),
    quantidade INTEGER NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL
);

-- Inserir um Admin padrão se a tabela estiver vazia (Senha: admin123)
-- bcrypt hash para 'admin123': $2b$10$YourHashHere... (vamos criar isso via API, mas fica aqui o aviso)
