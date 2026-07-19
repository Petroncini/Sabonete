// ============================================================
// Ateliê Camila Petroncini — main.js
// AJAX, filtros, carrinho, carrossel, modal, scroll reveal
// ============================================================

'use strict';

// ============================================================
// GUARDA DE SESSÃO — detecta token "fantasma" (válido mas de um
// usuário que não existe mais, ex: banco resetado em dev) e força
// logout + redirect pro login em vez de deixar a página quebrar
// com um erro confuso de banco de dados.
// ============================================================
(function installSessionGuard() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);
        if (response.status === 401 && localStorage.getItem('token')) {
            const isLoginPage = window.location.pathname.endsWith('/login');
            let isSessaoInvalida = false;
            try {
                const clone = response.clone();
                const data = await clone.json();
                isSessaoInvalida = data?.error === 'SESSAO_INVALIDA';
            } catch (e) { /* corpo não é JSON, ignora */ }

            if (isSessaoInvalida && !isLoginPage) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Sua sessão expirou. Faça login novamente.');
                window.location.href = '/login';
            }
        }
        return response;
    };
})();

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
let allProducts = [];

function getCartKey() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.id) {
                return `cart_${user.id}`;
            } else if (user && user.email) {
                return `cart_${user.email}`;
            }
        } catch (e) { }
    }
    return 'cart_guest';
}

const state = {
    cart: JSON.parse(localStorage.getItem(getCartKey()) || '[]'),
    currentFilter: 'todos',
};

// ============================================================
// DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
    initNavbar();
    initRevealScroll();
    renderProducts('todos');
    renderFilterBar();
    initContactForm();
    initModal();
    initCartUI();
    initHeroCarousel();
    initSectionImages();
});

// ============================================================
// AUTHENTICATION UI
// ============================================================
function initAuthUI() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    let user = null;
    try { user = JSON.parse(userStr); } catch (e) { }

    // Encontra os links de login e admin
    const loginLinks = document.querySelectorAll('a[href="/login"]');
    const adminLinks = document.querySelectorAll('a[href="/backoffice"]:not(#admin-link-dropdown)');

    const navContainer = document.querySelector('.flex.items-center.gap-4');

    if (token && user && navContainer) {
        if (!document.getElementById('user-menu-container')) {
            const userMenuHTML = `
              <div id="user-menu-container" class="relative">
                <button id="user-icon-btn" class="p-1 transition-transform hover:scale-110 flex items-center justify-center" aria-label="Menu de usuário">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="color:var(--heading)">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <span id="user-name-display" class="block px-4 py-2 text-sm text-gray-700 border-b">Olá, ${user.nome || user.name || 'Usuário'}</span>
                  <a href="/meus-pedidos" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Meus Pedidos</a>
                  ${user.role === 'admin' ? '<a href="/backoffice" id="admin-link-dropdown" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Admin Panel</a>' : ''}
                  <a href="#" id="logout-btn" class="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Sair</a>
                </div>
              </div>
            `;
            navContainer.insertAdjacentHTML('afterbegin', userMenuHTML);
        }

        const userMenuContainer = document.getElementById('user-menu-container');
        const logoutBtn = document.getElementById('logout-btn');
        const userIconBtn = document.getElementById('user-icon-btn');
        const userDropdown = document.getElementById('user-dropdown');

        loginLinks.forEach(link => {
            if (link.parentElement.tagName === 'LI') link.parentElement.style.display = 'none';
            else link.style.display = 'none';
        });

        adminLinks.forEach(link => {
            if (link.parentElement.tagName === 'LI') link.parentElement.style.display = 'none';
            else link.style.display = 'none';
        });

        if (userIconBtn && userDropdown) {
            userIconBtn.addEventListener('click', (e) => {
                e.preventDefault();
                userDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', (e) => {
                if (!userMenuContainer.contains(e.target)) {
                    userDropdown.classList.add('hidden');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/home';
            });
        }
    } else {
        loginLinks.forEach(link => {
            if (link.parentElement.tagName === 'LI') link.parentElement.style.display = 'block';
            else link.style.display = 'block';
        });

        // Esconde o admin link para usuários não logados
        adminLinks.forEach(link => {
            if (link.parentElement.tagName === 'LI') link.parentElement.style.display = 'none';
            else link.style.display = 'none';
        });
    }
}

// ============================================================
// NAVBAR: scroll + hero mode + mobile hamburger
// ============================================================
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    function updateNavbar() {
        const hasHero = !!document.getElementById('hero');
        if (!hasHero) {
            navbar.classList.add('scrolled');
            navbar.classList.remove('hero-mode');
            return;
        }
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
    return fetch('/api/produtos')
        .then(res => {
            if (!res.ok) {
                throw new Error(`Erro na API: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (!Array.isArray(data)) {
                console.error('Resposta da API não é um array:', data);
                return [];
            }
            const formattedProducts = data.map(p => {
                const tagNomes = (p.tags || []).map(t => t.nome);
                const isKit = tagNomes.includes('kits');
                const isNew = (new Date() - new Date(p.criado_em)) < 7 * 24 * 60 * 60 * 1000;
                return {
                    id: p.id,
                    name: p.nome,
                    tagIds: (p.tags || []).map(t => t.id),
                    price: parseFloat(p.preco),
                    badge: isKit ? 'kit' : (isNew ? 'new' : ''),
                    badgeLabel: isKit ? 'Kit' : (isNew ? 'Novo' : ''),
                    tags: tagNomes.length > 0 ? tagNomes : ['artesanal'],
                    desc: p.descricao,
                    img: p.imagem_url || 'https://placehold.co/400x400/FAF5EF/8B9E84?text=Sem+Imagem',
                    details: `Peso: ${p.peso_gramas}g`,
                    ingredients: p.ingredientes || null,
                    estoque: p.estoque
                };
            });

            formattedProducts.sort((a, b) => {
                const aEstoque = a.estoque > 0 ? 1 : 0;
                const bEstoque = b.estoque > 0 ? 1 : 0;
                return bEstoque - aEstoque;
            });

            allProducts = formattedProducts;

            if (category === 'todos') return formattedProducts;
            return formattedProducts.filter(p => p.tagIds.includes(parseInt(category)));
        })
        .catch(err => {
            console.error('Error fetching products:', err);
            return [];
        });
}

function createProductCard(p) {
    const isOutOfStock = p.estoque <= 0;
    const badgeHtml = isOutOfStock
        ? `<span class="product-badge out-of-stock" style="background-color: #666; color: white;">Esgotado</span>`
        : (p.badge ? `<span class="product-badge ${p.badge}">${p.badgeLabel}</span>` : '');
    const tagsHtml = p.tags.map(t => `<span class="product-tag">${t}</span>`).join('');

    const btnHtml = isOutOfStock
        ? `<button class="btn-cart" disabled style="background-color: #ccc; cursor: not-allowed;">Esgotado</button>`
        : `<button class="btn-cart" data-id="${p.id}" aria-label="Adicionar ${p.name} ao carrinho">Adicionar</button>`;

    return `
    <article class="product-card" data-id="${p.id}" role="button" tabindex="0" aria-label="Ver detalhes: ${p.name}">
      <div class="product-card-img-wrap ${isOutOfStock ? 'opacity-70' : ''}">
        ${badgeHtml}
        <img src="${p.img}" alt="${p.name}" class="product-card-img" loading="lazy"/>
      </div>
      <div class="product-card-body">
        <h3 class="product-card-title">${p.name}</h3>
        <p class="product-card-desc">${p.desc}</p>
        <div class="product-tags">${tagsHtml}</div>
        <div class="product-card-footer">
          <span class="product-price"><span class="price-currency">R$</span>${p.price.toFixed(2).replace('.', ',')}</span>
          ${btnHtml}
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

// Busca as tags cadastradas e monta os botões de filtro dinamicamente
// (além do botão fixo "Todos" que já existe no HTML).
async function renderFilterBar() {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    try {
        const res = await fetch('/api/tags');
        const tags = await res.json();

        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = tag.id;
            btn.textContent = tag.nome.charAt(0).toUpperCase() + tag.nome.slice(1);
            filterBar.appendChild(btn);
        });
    } catch (err) {
        console.error('Erro ao carregar tags para os filtros:', err);
    } finally {
        initFilterButtons();
    }
}

// ============================================================
// CARRINHO
// ============================================================
function addToCart(productId, btnEl) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.qty++;
    } else {
        state.cart.push({ ...product, qty: 1 });
    }

    localStorage.setItem(getCartKey(), JSON.stringify(state.cart));

    // Feedback visual no botão
    const isModalBtn = btnEl.classList.contains('btn-primary');
    const originalText = btnEl.textContent;
    btnEl.textContent = 'Adicionado';
    btnEl.classList.add('added');
    if (isModalBtn) {
        btnEl.style.background = 'var(--accent)';
        btnEl.style.borderColor = 'var(--accent)';
    }
    setTimeout(() => {
        btnEl.textContent = originalText;
        btnEl.classList.remove('added');
        if (isModalBtn) {
            btnEl.style.background = '';
            btnEl.style.borderColor = '';
        }
    }, 2000);

    updateCartBadge();
}

function initCartUI() {
    updateCartBadge();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id !== productId);
    localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
    updateCartBadge();
    if (typeof renderCart === 'function') {
        renderCart();
    }
}

function updateQty(productId, change) {
    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += change;
        if (existing.qty <= 0) {
            removeFromCart(productId);
            return;
        }
        localStorage.setItem(getCartKey(), JSON.stringify(state.cart));
        updateCartBadge();
        if (typeof renderCart === 'function') {
            renderCart();
        }
    }
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
          ${product.ingredients ? `<p style="font-size:.8rem;color:var(--secondary)"><strong>Ingredientes:</strong> ${product.ingredients}</p>` : ''}
          <div class="product-tags mt-4 mb-5">${product.tags.map(t => `<span class="product-tag">${t}</span>`).join('')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:nowrap;">
            <span class="product-price" style="font-size:1.6rem;white-space:nowrap"><span class="price-currency" style="font-size:1rem">R$</span>${product.price.toFixed(2).replace('.', ',')}</span>
            ${product.estoque <= 0
                ? `<button class="btn-primary" disabled style="background-color: #ccc; cursor: not-allowed; opacity: 0.8;font-size:.75rem;padding:.6rem 1.2rem">Esgotado</button>`
                : `<button class="btn-primary" id="modal-cart-btn" data-id="${product.id}" style="font-size:.75rem;padding:.6rem 1.2rem;white-space:nowrap">Adicionar ao Carrinho</button>`}
          </div>
          <a href="https://wa.me/554988122851?text=Olá! Tenho interesse no ${encodeURIComponent(product.name)}" target="_blank" rel="noopener"
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
    return fetch('/api/produtos')
        .then(res => res.json())
        .then(data => {
            const product = data.find(p => p.id === id);
            if (!product) return null;

            return {
                id: product.id,
                name: product.nome,
                category: product.categoria || 'todos',
                price: parseFloat(product.preco),
                badge: product.categoria === 'kits' ? 'kit' : ((new Date() - new Date(product.criado_em)) < 30 * 24 * 60 * 60 * 1000 ? 'new' : ''),
                badgeLabel: product.categoria === 'kits' ? 'Kit' : ((new Date() - new Date(product.criado_em)) < 30 * 24 * 60 * 60 * 1000 ? 'Novo' : ''),
                tags: [product.categoria || 'artesanal'],
                desc: product.descricao,
                img: product.imagem_url || 'https://placehold.co/400x400/FAF5EF/8B9E84?text=Sem+Imagem',
                details: `Peso: ${product.peso_gramas}g. Dimensões: ${product.comprimento_cm}x${product.largura_cm}x${product.altura_cm}cm`,
                ingredients: product.ingredientes || null,
                estoque: product.estoque
            };
        })
        .catch(err => {
            console.error(err);
            return null;
        });
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

// Envia um POST com Fetch API para o backend real
function submitContactForm(data) {
    return fetch('/api/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(res => {
        if (!res.ok) throw new Error('Erro na requisição');
        return res.json();
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

// ============================================================
// HERO CAROUSEL
// ============================================================

let heroSlides = [];
let heroCurrentIndex = 0;
let heroAutoTimer = null;

let heroListenersAdded = false;


async function initHeroCarousel() {
    const track = document.getElementById('hero-slides-track');
    if (!track) return;

    // Render fallback immediately so the timer starts from page load
    heroSlides = [{
        id: 1,
        image_url: 'imagens/hero_bg.jpeg',
        title: document.getElementById('hero-title')?.textContent || '',
        subtitle: document.getElementById('hero-subtitle')?.textContent || '',
    }];
    renderHeroSlides();

    // Fetch real slides — update DOM without restarting timer
    try {
        const res = await fetch('/api/content/hero_slides');
        if (!res.ok) throw new Error('no content');
        const fetched = await res.json();
        if (fetched && fetched.length > 0) {
            heroSlides = fetched;
            updateHeroDOM(); // Only updates slides/dots, not the timer
        }
    } catch (e) { /* keep fallback */ }

    // Admin edit button
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        const editBtn = document.getElementById('hero-edit-btn');
        if (editBtn) {
            editBtn.classList.remove('hidden');
            editBtn.addEventListener('click', abrirHeroEdit);
        }
    }
}

// Updates only slide backgrounds and dots — does NOT restart timer or re-add listeners
function updateHeroDOM() {
    const track = document.getElementById('hero-slides-track');
    const dotsEl = document.getElementById('hero-dots');
    const hero = document.getElementById('hero');
    if (!track) return;

    if (heroCurrentIndex >= heroSlides.length) heroCurrentIndex = 0;

    track.innerHTML = heroSlides.map((s, i) => `
        <div class="hero-slide${i === heroCurrentIndex ? ' active' : ''}" data-index="${i}">
            <img src="${s.image_url}" alt="" />
            <div class="hero-slide-overlay"></div>
        </div>
    `).join('');

    if (dotsEl) {
        dotsEl.innerHTML = heroSlides.map((_, i) => `
            <button class="hero-dot${i === heroCurrentIndex ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>
        `).join('');
        dotsEl.querySelectorAll('.hero-dot').forEach(btn => {
            btn.addEventListener('click', () => goToHeroSlide(parseInt(btn.dataset.index)));
        });
    }

    if (hero) hero.classList.toggle('hero-single', heroSlides.length === 1);
    updateHeroText();
    // Update auto-advance only if needed (slide count changed)
    if (heroSlides.length > 1 && !heroAutoTimer) startHeroAutoAdvance();
    if (heroSlides.length <= 1) stopHeroAutoAdvance();
}

function renderHeroSlides() {
    updateHeroDOM();

    // Register listeners only once
    if (!heroListenersAdded) {
        heroListenersAdded = true;
        document.getElementById('hero-prev')?.addEventListener('click', () =>
            goToHeroSlide((heroCurrentIndex - 1 + heroSlides.length) % heroSlides.length));
        document.getElementById('hero-next')?.addEventListener('click', () =>
            goToHeroSlide((heroCurrentIndex + 1) % heroSlides.length));
        const hero = document.getElementById('hero');
        hero?.addEventListener('mouseenter', stopHeroAutoAdvance);
        hero?.addEventListener('mouseleave', startHeroAutoAdvance);
    }

    startHeroAutoAdvance();
}

function updateHeroText() {
    const slide = heroSlides[heroCurrentIndex];
    if (!slide) return;
    const titleEl = document.getElementById('hero-title');
    const subtitleEl = document.getElementById('hero-subtitle');
    if (titleEl) titleEl.textContent = slide.title;
    if (subtitleEl) subtitleEl.textContent = slide.subtitle;
}

function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    slides[heroCurrentIndex]?.classList.remove('active');
    dots[heroCurrentIndex]?.classList.remove('active');
    heroCurrentIndex = index;
    slides[heroCurrentIndex]?.classList.add('active');
    dots[heroCurrentIndex]?.classList.add('active');
    updateHeroText();
}

function startHeroAutoAdvance() {
    stopHeroAutoAdvance();
    if (heroSlides.length <= 1) return;
    heroAutoTimer = setInterval(() => {
        goToHeroSlide((heroCurrentIndex + 1) % heroSlides.length);
    }, 5000);
}

function stopHeroAutoAdvance() {
    if (heroAutoTimer) { clearInterval(heroAutoTimer); heroAutoTimer = null; }
}

// ============================================================
// HERO EDIT MODAL (admin)
// ============================================================

let heroEditSlides = []; // local copy being edited

function abrirHeroEdit() {
    heroEditSlides = heroSlides.map(s => ({ ...s }));
    renderHeroSlideEditors();
    document.getElementById('hero-edit-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function fecharHeroEdit() {
    document.getElementById('hero-edit-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
}

function renderHeroSlideEditors() {
    const list = document.getElementById('hero-slides-editor-list');
    if (!list) return;
    const isSingle = heroEditSlides.length <= 1;

    list.innerHTML = heroEditSlides.map((s, i) => `
        <div class="hero-slide-editor" data-edit-index="${i}">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem">
                <img class="thumb" src="${s.image_url}" alt="" />
                <div style="flex:1">
                    <p style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--secondary)">Slide ${i + 1}</p>
                </div>
                <!-- reorder -->
                <button onclick="moveHeroSlide(${i},-1)" title="Mover para cima"
                    style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:.2rem .5rem;cursor:pointer;font-size:1rem"
                    ${i === 0 ? 'disabled style="opacity:.3"' : ''}>↑</button>
                <button onclick="moveHeroSlide(${i},1)" title="Mover para baixo"
                    style="background:none;border:1.5px solid var(--border);border-radius:6px;padding:.2rem .5rem;cursor:pointer;font-size:1rem"
                    ${i === heroEditSlides.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
                <!-- remove -->
                <button onclick="removeHeroSlide(${i})" title="Remover slide"
                    style="background:none;border:none;color:#ef4444;font-size:1.2rem;cursor:pointer"
                    ${isSingle ? 'disabled style="opacity:.3;cursor:not-allowed"' : ''}>🗑</button>
            </div>
            <!-- image upload -->
            <label style="display:block;margin-bottom:.25rem">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                    style="font-size:.8rem" onchange="uploadHeroSlideImage(this, ${i})" />
            </label>
            <p class="hero-slide-img-status" style="font-size:.72rem;color:var(--secondary);margin-bottom:.6rem"></p>
            <!-- title -->
            <div style="margin-bottom:.5rem">
                <label style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--secondary);display:block;margin-bottom:.25rem">Título</label>
                <input type="text" value="${escapeHtml(s.title)}"
                    oninput="heroEditSlides[${i}].title = this.value"
                    style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:.5rem .8rem;font-size:.9rem;outline:none" />
            </div>
            <!-- subtitle -->
            <div style="margin-bottom:.8rem">
                <label style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--secondary);display:block;margin-bottom:.25rem">Subtítulo</label>
                <textarea oninput="heroEditSlides[${i}].subtitle = this.value"
                    style="width:100%;border:1.5px solid var(--border);border-radius:8px;padding:.5rem .8rem;font-size:.88rem;resize:none;height:64px;outline:none">${escapeHtml(s.subtitle)}</textarea>
            </div>
        </div>
    `).join('');
}

async function uploadHeroSlideImage(input, slideIndex) {
    const file = input.files[0];
    if (!file) return;
    const token = localStorage.getItem('token');
    const statusEl = input.closest('.hero-slide-editor').querySelector('.hero-slide-img-status');
    statusEl.textContent = 'Enviando…';

    const formData = new FormData();
    formData.append('imagem', file);

    try {
        const res = await fetch('/api/produtos/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro no upload');

        heroEditSlides[slideIndex].image_url = data.url;
        statusEl.textContent = '✓ Imagem enviada';

        // Update thumb preview
        const thumb = input.closest('.hero-slide-editor').querySelector('img.thumb');
        if (thumb) thumb.src = data.url;
    } catch (err) {
        statusEl.textContent = '✗ ' + err.message;
    }
}

function insertHeroSlide(atIndex) {
    const newSlide = {
        id: Date.now(),
        image_url: heroEditSlides[Math.max(0, atIndex - 1)]?.image_url || 'imagens/hero_bg.jpeg',
        title: 'Novo Slide',
        subtitle: 'Edite o subtítulo aqui.',
    };
    heroEditSlides.splice(atIndex, 0, newSlide);
    renderHeroSlideEditors();
}

function addHeroSlide() { insertHeroSlide(heroEditSlides.length); }

function moveHeroSlide(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= heroEditSlides.length) return;
    [heroEditSlides[index], heroEditSlides[target]] = [heroEditSlides[target], heroEditSlides[index]];
    renderHeroSlideEditors();
}

function removeHeroSlide(index) {
    if (heroEditSlides.length <= 1) return;
    if (confirm("Tem certeza que deseja remover este slide?")) {
        heroEditSlides.splice(index, 1);
    }
    renderHeroSlideEditors();
}

async function salvarHeroSlides() {
    const token = localStorage.getItem('token');
    const btn = document.querySelector('#hero-edit-overlay .btn-primary');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    try {
        const res = await fetch('/api/content/hero_slides', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(heroEditSlides),
        });
        if (!res.ok) throw new Error('Erro ao salvar');

        heroSlides = heroEditSlides.map(s => ({ ...s }));
        heroCurrentIndex = 0;
        updateHeroDOM(); // Don't restart timer
        fecharHeroEdit();
    } catch (err) {
        alert('Erro ao salvar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
}

// ============================================================
// SECTION IMAGES (sobre + contato)
// ============================================================

async function initSectionImages() {
    const sobreImg = document.getElementById('sobre-img');
    const contatoImg = document.getElementById('contato-img');
    if (!sobreImg && !contatoImg) return;

    try {
        const res = await fetch('/api/content/section_images');
        if (res.ok) {
            const data = await res.json();
            if (data.sobre && sobreImg) sobreImg.src = data.sobre;
            if (data.contato && contatoImg) contatoImg.src = data.contato;
        }
    } catch (e) { /* usa imagens locais como fallback */ }

    // Show admin edit buttons
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        const sobreBtn = document.getElementById('sobre-edit-btn');
        const contatoBtn = document.getElementById('contato-edit-btn');
        if (sobreBtn) {
            sobreBtn.classList.remove('hidden');
            sobreBtn.addEventListener('click', () => triggerSectionImageUpload('sobre'));
        }
        if (contatoBtn) {
            contatoBtn.classList.remove('hidden');
            contatoBtn.addEventListener('click', () => triggerSectionImageUpload('contato'));
        }
    }
}

function triggerSectionImageUpload(section) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const token = localStorage.getItem('token');

        const btn = document.getElementById(`${section}-edit-btn`);
        const originalText = btn.textContent;
        btn.textContent = 'Enviando…';

        const formData = new FormData();
        formData.append('imagem', file);

        try {
            // 1. Upload image to R2
            const upRes = await fetch('/api/produtos/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const upData = await upRes.json();
            if (!upRes.ok) throw new Error(upData.error || 'Erro no upload');

            // 2. Read current section_images and update the relevant key
            const current = await (await fetch('/api/content/section_images')).json().catch(() => ({}));
            current[section] = upData.url;

            // 3. Save
            const saveRes = await fetch('/api/content/section_images', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(current),
            });
            if (!saveRes.ok) throw new Error('Erro ao salvar');

            // 4. Update image on page
            document.getElementById(`${section}-img`).src = upData.url;
            btn.textContent = '✓ Salvo';
            setTimeout(() => { btn.textContent = originalText; }, 2000);
        } catch (err) {
            btn.textContent = '✗ ' + err.message;
            setTimeout(() => { btn.textContent = originalText; }, 3000);
        }
    };
    input.click();
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
