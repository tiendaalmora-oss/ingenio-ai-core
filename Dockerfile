# Base image Node.js 20 en Alpine Linux
FROM node:20.20.2-alpine

WORKDIR /app

# Instalar librerías de sistema nativas necesarias para Prisma Engine
RUN apk add --no-cache openssl libc6-compat

# Copiar manifiestos de dependencias y schema de Prisma
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
COPY scripts ./scripts/

# Instalar dependencias completas
RUN npm install

# Copiar código fuente (respetando .dockerignore)
COPY . .

# Generar cliente de Prisma
RUN npx prisma generate

# Compilar proyecto NestJS
RUN npm run build

# Exponer puerto 3000
EXPOSE 3000

# Comando de arranque en producción
CMD ["npm", "run", "start:prod"]
