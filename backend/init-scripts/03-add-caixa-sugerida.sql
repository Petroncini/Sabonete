-- Guarda a caixa sugerida pela SuperFrete no momento da compra, pra ficar
-- disponível no backoffice quando o pedido for embalado depois.
ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS caixa_sugerida JSONB;
