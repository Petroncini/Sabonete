# Ateliê Camila Petroncini - Sabonetes Artesanais

Bem-vindo ao repositório do e-commerce **Ateliê Camila Petroncini**. Este projeto é uma loja virtual completa para venda de sabonetes e essências artesanais, contando com um frontend desenvolvido em HTML/CSS/JS (com TailwindCSS) e um backend em Node.js.

## 📁 Estrutura do Projeto

O projeto é dividido em duas partes principais: **Frontend** (na raiz do projeto) e **Backend** (na pasta `backend/`).

### Frontend (Raiz)
* **`index.html`**: Landing page principal com listagem de produtos, seção sobre a loja, depoimentos e formulário de contato.
* **`login.html`**: Página de autenticação e cadastro de novos usuários.
* **`carrinho.html`**: Página do carrinho de compras, com controle dinâmico de quantidades indexado ao usuário logado.
* **`checkout.html`**: Etapa final de compra, onde são definidos os dados de entrega e forma de pagamento (ex: geração de PIX copia e cola).
* **`backoffice.html`**: Painel administrativo para gestão de produtos e acompanhamento de pedidos recentes (acessível apenas para usuários com perfil `admin`).
* **`main.js`**: Lógica central do frontend (comunicação com a API, manipulação do carrinho via `localStorage`, gerenciamento de estados de login, interface, etc.).
* **`style.css`**: Estilização base e customizada não coberta pelo Tailwind.
* **`imagens/`**: Diretório contendo as imagens estáticas utilizadas no site.

### Backend (`/backend`)
* **`server.js`**: Ponto de entrada da API Node.js/Express.
* **`db.js`**: Configuração e conexão com o banco de dados (PostgreSQL).
* **`routes/` & `middlewares/`**: Lógicas de roteamento, autenticação e validações da API.
* **`docker-compose.yml`**: Orquestração dos containers (ex: banco de dados PostgreSQL) para rodar o ambiente local.
* **`init-scripts/`**: Scripts de inicialização e criação das tabelas do banco de dados (seeders/migrations).

---

## 🚀 Guia de Inicialização

Siga os passos abaixo para rodar o projeto localmente em sua máquina.

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 16+ recomendada)
* [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) (para o banco de dados)
* Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) (opcional, para emular o frontend)

### Passo 1: Configurar e Rodar o Backend

1. Abra o terminal e navegue até a pasta do backend:
   ```bash
   cd backend
   ```
2. Crie o seu arquivo de variáveis de ambiente com base no exemplo:
   ```bash
   cp .env.example .env
   ```
   *(Edite o `.env` se precisar alterar credenciais do banco ou chaves, caso contrário, pode usar os valores padrões).*

3. Suba o container do banco de dados utilizando o Docker:
   ```bash
   docker-compose up -d
   ```
4. Instale as dependências do Node:
   ```bash
   npm install
   ```
5. Inicie o servidor da API:
   ```bash
   npm start
   ```
   *A API estará rodando em `http://localhost:3000`.*


### Passo 2: Testando a Aplicação

* **Área do Cliente**: Acesse a página inicial, crie uma conta, explore a loja e o carrinho. O carrinho é salvo localmente e atrelado unicamente ao seu usuário.
* **Área do Admin**: Para acessar o `backoffice.html`, você precisa estar logado com uma conta que possua a `role` configurada como `admin` no banco de dados.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla), TailwindCSS (via CDN).
* **Backend:** Node.js, Express.
* **Banco de Dados:** PostgreSQL (via Docker).

## 📝 Notas de Desenvolvimento

* A persistência local do carrinho é baseada no ID ou E-mail do usuário no `localStorage`.
* As requisições (Fetch API) feitas pelo frontend apontam, por padrão, para `http://localhost:3000/api`. Certifique-se de que a API está rodando antes de logar ou adicionar produtos!
