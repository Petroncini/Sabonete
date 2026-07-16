-- Adiciona coluna para manter o nome do produto caso ele seja apagado
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS produto_nome VARCHAR(255);

-- Atualiza os registros existentes
UPDATE pedido_itens 
SET produto_nome = produtos.nome 
FROM produtos 
WHERE pedido_itens.produto_id = produtos.id 
AND pedido_itens.produto_nome IS NULL;

-- Remove a constraint antiga
ALTER TABLE pedido_itens DROP CONSTRAINT IF EXISTS pedido_itens_produto_id_fkey;

-- Adiciona a nova constraint com ON DELETE SET NULL
ALTER TABLE pedido_itens ADD CONSTRAINT pedido_itens_produto_id_fkey 
FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL;
