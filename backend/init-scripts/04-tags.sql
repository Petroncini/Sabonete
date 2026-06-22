-- Sistema de tags dinâmico (substitui a coluna fixa "categoria") — permite
-- que a admin crie/edite/remova tags livremente e associe várias por produto.
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS produto_tags (
    produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (produto_id, tag_id)
);

-- Migra os valores de categoria já existentes pra tags, pra não perder a
-- categorização atual dos produtos.
INSERT INTO tags (nome)
SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL
ON CONFLICT (nome) DO NOTHING;

INSERT INTO produto_tags (produto_id, tag_id)
SELECT p.id, t.id
FROM produtos p
JOIN tags t ON t.nome = p.categoria
WHERE p.categoria IS NOT NULL
ON CONFLICT DO NOTHING;
