-- Migration: Adiciona suporte ao MercadoPago na tabela pedidos
-- Execute este script SE o banco já existir (sem recriar o schema do zero)

ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS mp_payment_id VARCHAR(50) UNIQUE;

-- Renomeia o comentário da coluna txid para refletir o novo uso
COMMENT ON COLUMN pedidos.txid IS 'Referência externa do pedido enviada ao MercadoPago (ex: PEDIDO-42)';
COMMENT ON COLUMN pedidos.mp_payment_id IS 'ID do pagamento retornado pelo MercadoPago';
