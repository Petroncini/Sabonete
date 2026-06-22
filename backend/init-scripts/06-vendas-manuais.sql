-- Suporte a vendas manuais (presencial, WhatsApp, Instagram, dinheiro, etc.)
-- registradas diretamente pela administradora, sem passar pelo fluxo de PIX.

-- Vendas manuais não têm endereço de entrega necessariamente (retirada em
-- mãos, por exemplo), então o endereço deixa de ser obrigatório.
ALTER TABLE pedidos ALTER COLUMN cliente_endereco DROP NOT NULL;

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS origem_venda VARCHAR(50);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS registrado_manualmente BOOLEAN NOT NULL DEFAULT false;
