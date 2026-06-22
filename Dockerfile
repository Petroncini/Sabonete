FROM node:18-alpine

# Cria a pasta de trabalho
WORKDIR /app

# Copia todo o código (backend e frontend)
COPY . .

# Entra na pasta backend e instala as dependências
RUN cd backend && npm install

# Expõe a porta que o Railway vai usar
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "backend/server.js"]
