-- Tabela de conteúdo editável do site (hero slides, imagens de seção)
CREATE TABLE IF NOT EXISTS site_content (
    key   TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed: slides do hero (padrão com imagem local)
INSERT INTO site_content (key, value) VALUES (
    'hero_slides',
    '[
        {
            "id": 1,
            "image_url": "imagens/hero_bg.jpeg",
            "title": "Sabonetes e Essências artesanais",
            "subtitle": "Feitos à mão com ingredientes naturais cuidadosamente selecionados. Para o seu cuidado, aconchego e bem-estar."
        }
    ]'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Seed: imagens das seções (sobre e contato)
INSERT INTO site_content (key, value) VALUES (
    'section_images',
    '{
        "sobre": "imagens/sobre_artesa.png",
        "contato": "imagens/hero_bg.png"
    }'::jsonb
) ON CONFLICT (key) DO NOTHING;
