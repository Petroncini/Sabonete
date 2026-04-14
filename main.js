// ============================================================
// Ateliê Camila Petroncini — main.js
// AJAX, filtros, carrinho, carrossel, modal, scroll reveal
// ============================================================

'use strict';

// ============================================================
// DADOS DOS PRODUTOS (simulando um endpoint de API)
// ============================================================
const PRODUCTS = [
    {
        id: 1,
        name: 'Sabonete de Lavanda',
        category: 'corpo',
        price: 18.90,
        badge: 'new',
        badgeLabel: 'Novo',
        tags: ['Lavanda', 'Calmante', 'Hidratante'],
        desc: 'Esfoliante suave com aroma relaxante de lavanda pura.',
        img: 'imagens/produtos/lavanda.png',
        details: 'Formulado com óleos essenciais de lavanda certificados, manteiga de karité e extrato de camomila. Ideal para encerrar o dia com leveza. Peso: 100g.',
        ingredients: 'Óleo de coco, manteiga de karité, óleo essencial de lavanda, glicerina vegetal, extrato de camomila.',
    },
    {
        id: 2,
        name: 'Sabonete de Argila Rosa',
        category: 'rosto',
        price: 22.00,
        badge: '',
        badgeLabel: '',
        tags: ['Argila Rosa', 'Purificante', 'Anti-acne'],
        desc: 'Limpa profundamente os poros com argila rosa natural.',
        img: 'imagens/produtos/argila.png',
        details: 'A argila rosa age sobre a pele de forma suave, absorvendo impurezas sem ressecá-la. Rica em minerais essenciais para a renovação celular. Peso: 80g.',
        ingredients: 'Argila rosa, óleo de rosa mosqueta, aloe vera, glicerina vegetal, óleo de jojoba.',
    },
    {
        id: 3,
        name: 'Sabonete de Café & Baunilha',
        category: 'corpo',
        price: 20.50,
        badge: 'new',
        badgeLabel: 'Novo',
        tags: ['Café', 'Baunilha', 'Esfoliante'],
        desc: 'Esfoliante energizante com borra de café e extrato de baunilha.',
        img: 'imagens/produtos/cafe.png',
        details: 'A borra de café esfoliante remove células mortas e melhora a circulação. O aroma de baunilha transforma o banho em momento de prazer. Peso: 110g.',
        ingredients: 'Borra de café, óleo de coco, extrato de baunilha, mel, glicerina vegetal.',
    },
    {
        id: 4,
        name: 'Sabonete de Aveia & Mel',
        category: 'rosto',
        price: 19.00,
        badge: '',
        badgeLabel: '',
        tags: ['Aveia', 'Mel', 'Suavizante'],
        desc: 'Suaviza e nutre peles sensíveis com aveia coloidal e mel.',
        img: 'imagens/produtos/aveia.png',
        details: 'A aveia coloidal cria uma barreira protetora na pele enquanto o mel retém a hidratação natural. Indicado para peles sensíveis e reativas. Peso: 90g.',
        ingredients: 'Aveia coloidal, mel orgânico, óleo de amêndoas, glicerina vegetal, camomila.',
    },
    {
        id: 5,
        name: 'Sabonete de Hortelã & Eucalipto',
        category: 'corpo',
        price: 17.50,
        badge: '',
        badgeLabel: '',
        tags: ['Hortelã', 'Eucalipto', 'Refrescante'],
        desc: 'Sensação refrescante e purificante para o corpo todo.',
        img: 'imagens/produtos/hortela.png',
        details: 'A combinação de hortelã e eucalipto proporciona uma sensação única de frescor e leveza, ideal para dias quentes ou pós-exercício. Peso: 100g.',
        ingredients: 'Óleo essencial de hortelã, óleo essencial de eucalipto, óleo de palma certificado, glicerina.',
    },
    {
        id: 6,
        name: 'Kit Presente Especial',
        category: 'kits',
        price: 68.00,
        badge: 'kit',
        badgeLabel: 'Kit',
        tags: ['Kit', 'Presente', 'Exclusivo'],
        desc: 'Kit com 4 sabonetes especiais em embalagem para presentear.',
        img: 'imagens/produtos/kit1.png',
        details: 'O Kit Presente Especial contém 4 sabonetes artesanais à escolha, embalados em caixa kraft com fitinha de cetim e tag personalizada. Perfeito para datas especiais!',
        ingredients: 'Composição varia conforme os sabonetes escolhidos.',
    },
    {
        id: 7,
        name: 'Sabonete de Rosa & Gerânio',
        category: 'especiais',
        price: 25.00,
        badge: '',
        badgeLabel: '',
        tags: ['Rosa', 'Gerânio', 'Floral'],
        desc: 'Delicado aroma floral com pétalas de rosa desidratadas incrustadas.',
        img: 'imagens/produtos/rosa.png',
        details: 'Com pétalas de rosa desidratadas reais incrustadas na massa, este sabonete é uma obra de arte funcional. O gerânio equilibra o humor e a pele. Peso: 95g.',
        ingredients: 'Pétalas de rosa desidratadas, óleo essencial de gerânio, manteiga de cacau, óleo de rosa mosqueta.',
    },
    {
        id: 8,
        name: 'Kit Cuidado Diário',
        category: 'kits',
        price: 85.00,
        badge: 'kit',
        badgeLabel: 'Kit',
        tags: ['Kit', 'Rotina', 'Facial + Corporal'],
        desc: 'Kit completo com sabonetes faciais e corporais para rotina diária.',
        img: 'imagens/produtos/kit2.png',
        details: 'Inclui 2 sabonetes faciais e 2 corporais selecionados para complementar sua rotina de cuidados do matin ao entardecer. Embalagem sustentável kraft.',
        ingredients: 'Composição varia (argila rosa, aveia, lavanda, café).',
    },
];

// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================
const state = {
    cart: [],
    currentFilter: 'todos',
    carouselIndex: 0,
    carouselTotal: 3,
    carouselInterval: null,
};

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initRevealScroll();
    renderProducts('todos');
    initFilterButtons();
    initCarousel();
    initContactForm();
    initModal();
    initCartUI();
});

// ============================================================
// NAVBAR: scroll + hero mode + mobile hamburger
// ============================================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    function updateNavbar() {
        if (window.scrollY > 60) {
            navbar.classList.add('scrolled');
            navbar.classList.remove('hero-mode');
        } else {
            navbar.classList.remove('scrolled');
            navbar.classList.add('hero-mode');
        }
    }

    updateNavbar();
    window.addEventListener('scroll', updateNavbar, { passive: true });

    hamburger?.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        const isOpen = mobileMenu.classList.contains('open');
        hamburger.setAttribute('aria-expanded', isOpen);
        hamburger.innerHTML = isOpen
            ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>';
    });

    // Fechar menu ao clicar em link
    mobileMenu?.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            hamburger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>';
        });
    });
}

// ============================================================
// REVEAL ON SCROLL (Intersection Observer)
// ============================================================
function initRevealScroll() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach(el => {
        // Ativar imediatamente se já estiver na viewport
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.classList.add('visible');
        } else {
            observer.observe(el);
        }
    });
}

// ============================================================
// PRODUTOS — renderização e filtros (AJAX simulado)
// ============================================================
function renderProducts(category) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    // Simula fetch assíncrono com Fetch API / Promise
    fetchProducts(category).then(products => {
        // Fade out
        grid.style.opacity = '0';
        grid.style.transform = 'translateY(10px)';

        setTimeout(() => {
            if (products.length === 0) {
                grid.innerHTML = `
          <div class="col-span-full text-center py-16">
            <p class="text-lg" style="color:var(--secondary)">Nenhum produto encontrado nessa categoria.</p>
          </div>`;
            } else {
                grid.innerHTML = products.map(p => createProductCard(p)).join('');
                // Eventos de clique nos cards e botões
                grid.querySelectorAll('.product-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.btn-cart')) return;
                        openModal(parseInt(card.dataset.id));
                    });
                });
                grid.querySelectorAll('.btn-cart').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        addToCart(parseInt(btn.dataset.id), btn);
                    });
                });
            }

            // Fade in
            grid.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            grid.style.opacity = '1';
            grid.style.transform = 'translateY(0)';
        }, 200);
    });
}

// Simula uma Fetch API assíncrona para os dados de produto
function fetchProducts(category) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const filtered = category === 'todos'
                ? PRODUCTS
                : PRODUCTS.filter(p => p.category === category);
            resolve(filtered);
        }, 80);
    });
}

function createProductCard(p) {
    const badgeHtml = p.badge
        ? `<span class="product-badge ${p.badge}">${p.badgeLabel}</span>`
        : '';
    const tagsHtml = p.tags.map(t => `<span class="product-tag">${t}</span>`).join('');
    return `
    <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes: ${p.name}">
      <div class="product-card-img-wrap">
        ${badgeHtml}
        <img src="${p.img}" alt="${p.name}" class="product-card-img" loading="lazy"/>
      </div>
      <div class="product-card-body">
        <h3 class="product-card-title">${p.name}</h3>
        <p class="product-card-desc">${p.desc}</p>
        <div class="product-tags">${tagsHtml}</div>
        <div class="product-card-footer">
          <span class="product-price">R$ ${p.price.toFixed(2).replace('.', ',')}</span>
          <button class="btn-cart" data-id="${p.id}" aria-label="Adicionar ${p.name} ao carrinho">
            🛒 Adicionar
          </button>
        </div>
      </div>
    </article>`;
}

function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const cat = btn.dataset.filter;
            state.currentFilter = cat;
            renderProducts(cat);
        });
    });
}

// ============================================================
// CARRINHO
// ============================================================
function addToCart(productId, btnEl) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }

    // Feedback visual no botão
    btnEl.textContent = '✓ Adicionado';
    btnEl.classList.add('added');
    setTimeout(() => {
        btnEl.innerHTML = '🛒 Adicionar';
        btnEl.classList.remove('added');
    }, 1500);

    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    const total = state.cart.reduce((sum, item) => sum + item.qty, 0);
    if (badge) {
        badge.textContent = total;
        badge.classList.toggle('visible', total > 0);
    }
}

// ============================================================
// MODAL DE PRODUTO (AJAX simulado)
// ============================================================
function initModal() {
    const overlay = document.getElementById('product-modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');

    overlay?.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    closeBtn?.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal(productId) {
    fetchProductById(productId).then(product => {
        if (!product) return;
        const overlay = document.getElementById('product-modal-overlay');
        const content = document.getElementById('modal-content');

        content.innerHTML = `
      <div class="md:flex">
        <div class="md:w-2/5">
          <img src="${product.img}" alt="${product.name}" class="w-full h-72 md:h-full object-cover rounded-tl-2xl rounded-bl-none rounded-tr-2xl md:rounded-tr-none md:rounded-bl-2xl" />
        </div>
        <div class="md:w-3/5 p-8">
          <button class="modal-close" id="modal-close-btn" aria-label="Fechar">✕</button>
          ${product.badge ? `<span class="sobre-badge">${product.badgeLabel}</span>` : ''}
          <h2 class="section-title text-left text-2xl mb-2" style="text-align:left">${product.name}</h2>
          <p class="mb-4" style="color:var(--secondary);font-size:.9rem">${product.desc}</p>
          <p style="color:var(--text);font-size:.88rem;line-height:1.7;margin-bottom:1.2rem">${product.details}</p>
          <p style="font-size:.8rem;color:var(--secondary)"><strong>Ingredientes:</strong> ${product.ingredients}</p>
          <div class="product-tags mt-4 mb-5">${product.tags.map(t => `<span class="product-tag">${t}</span>`).join('')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem">
            <span class="product-price" style="font-size:1.6rem">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
            <button class="btn-primary" id="modal-cart-btn" data-id="${product.id}">🛒 Adicionar ao Carrinho</button>
          </div>
          <a href="https://wa.me/5511999999999?text=Olá! Tenho interesse no ${encodeURIComponent(product.name)}" target="_blank" rel="noopener"
             class="btn-outline mt-3" style="width:100%;justify-content:center">
            💬 Pedir pelo WhatsApp
          </a>
        </div>
      </div>`;

        // Rebind close btn
        document.getElementById('modal-close-btn')?.addEventListener('click', closeModal);
        // Bind add to cart
        document.getElementById('modal-cart-btn')?.addEventListener('click', (e) => {
            addToCart(product.id, e.target);
        });

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    });
}

function closeModal() {
    const overlay = document.getElementById('product-modal-overlay');
    overlay?.classList.remove('open');
    document.body.style.overflow = '';
}

function fetchProductById(id) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(PRODUCTS.find(p => p.id === id) || null);
        }, 60);
    });
}

// ============================================================
// CARROSSEL DE DEPOIMENTOS
// ============================================================
function initCarousel() {
    const track = document.getElementById('testimonial-track');
    if (!track) return;

    const total = track.children.length;
    state.carouselTotal = total;

    updateCarouselDots();
    startCarouselAutoplay();

    document.getElementById('carousel-prev')?.addEventListener('click', () => {
        goToSlide((state.carouselIndex - 1 + total) % total);
        resetAutoplay();
    });

    document.getElementById('carousel-next')?.addEventListener('click', () => {
        goToSlide((state.carouselIndex + 1) % total);
        resetAutoplay();
    });

    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.addEventListener('click', () => {
            goToSlide(i);
            resetAutoplay();
        });
    });
}

function goToSlide(index) {
    const track = document.getElementById('testimonial-track');
    if (!track) return;
    state.carouselIndex = index;
    track.style.transform = `translateX(-${index * 100}%)`;
    updateCarouselDots();
}

function updateCarouselDots() {
    document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === state.carouselIndex);
    });
}

function startCarouselAutoplay() {
    state.carouselInterval = setInterval(() => {
        goToSlide((state.carouselIndex + 1) % state.carouselTotal);
    }, 5000);
}

function resetAutoplay() {
    clearInterval(state.carouselInterval);
    startCarouselAutoplay();
}

// ============================================================
// FORMULÁRIO DE CONTATO (AJAX via Fetch API)
// ============================================================
function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const feedback = document.getElementById('form-feedback');

        // Validação simples
        const name = form.querySelector('#contact-name').value.trim();
        const email = form.querySelector('#contact-email').value.trim();
        const message = form.querySelector('#contact-message').value.trim();

        if (!name || !email || !message) {
            showFeedback('error', 'Por favor, preencha todos os campos.');
            return;
        }

        if (!isValidEmail(email)) {
            showFeedback('error', 'Por favor, informe um e-mail válido.');
            return;
        }

        // Estado de loading
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        // Simula POST via Fetch API (AJAX)
        submitContactForm({ name, email, message })
            .then(result => {
                if (result.success) {
                    showFeedback('success', `✅ Mensagem enviada com sucesso, ${name}! Responderemos em breve. 💛`);
                    form.reset();
                } else {
                    throw new Error('Falha no envio');
                }
            })
            .catch(() => {
                showFeedback('error', '❌ Erro ao enviar. Por favor, tente novamente ou entre em contato pelo WhatsApp.');
            })
            .finally(() => {
                btn.disabled = false;
                btn.textContent = 'Enviar Mensagem';
            });
    });
}

// Simula um POST com Fetch API — substituir pela URL real do backend
function submitContactForm(data) {
    return new Promise((resolve) => {
        // Simula latência de rede
        setTimeout(() => {
            console.log('[AJAX] Dados enviados:', data);
            resolve({ success: true });
        }, 1200);
    });
}

function showFeedback(type, message) {
    const feedback = document.getElementById('form-feedback');
    if (!feedback) return;
    feedback.className = `form-feedback ${type}`;
    feedback.id = 'form-feedback';
    feedback.textContent = message;
    feedback.style.display = 'block';
    setTimeout(() => { feedback.style.display = 'none'; }, 6000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
