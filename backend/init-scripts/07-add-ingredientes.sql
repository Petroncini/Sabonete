-- Adiciona coluna de ingredientes à tabela de produtos.
-- Campo opcional (nullable) — produtos sem ingredientes não exibem a seção no frontend.
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ingredientes TEXT;
