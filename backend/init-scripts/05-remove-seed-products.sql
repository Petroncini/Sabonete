-- Remove os produtos de exemplo (sabonetes "seed") que vieram com o projeto
-- inicialmente. Daqui pra frente, os produtos reais são cadastrados pela
-- administradora com fotos enviadas pro volume do Railway.
--
-- Identificamos os produtos seed pelo padrão antigo de imagem local
-- (imagens/produtos/...) — produtos novos sempre usam /uploads/... ou uma URL externa.

-- Remove pedido_itens que referenciam produtos seed (eram só pedidos de teste).
DELETE FROM pedido_itens
WHERE produto_id IN (SELECT id FROM produtos WHERE imagem_url LIKE 'imagens/produtos/%');

-- Remove pedidos que ficaram sem nenhum item depois da limpeza acima.
DELETE FROM pedidos
WHERE id NOT IN (SELECT DISTINCT pedido_id FROM pedido_itens);

-- Remove as tags associadas aos produtos seed.
DELETE FROM produto_tags
WHERE produto_id IN (SELECT id FROM produtos WHERE imagem_url LIKE 'imagens/produtos/%');

-- Remove os produtos seed propriamente ditos.
DELETE FROM produtos WHERE imagem_url LIKE 'imagens/produtos/%';
