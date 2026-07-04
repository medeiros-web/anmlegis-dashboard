# ── Plataforma Jurídico-Mineral ──────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm ci --omit=dev

# Copia todo o projeto
COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
