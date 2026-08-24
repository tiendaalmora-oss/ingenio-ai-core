# Base image
FROM node:20.20.2-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Copiar el código fuente (respetando .dockerignore)
COPY . .

# Generar Prisma Client con soporte multi-plataforma
RUN npx prisma generate

# Compilar NestJS
RUN npm run build

# --- Imagen final (ligera y lista para producción) ---
FROM node:20.20.2-alpine

WORKDIR /app

# Instalar dependencias nativas de runtime para Prisma
RUN apk add --no-cache openssl libc6-compat

# Copiar dependencias de producción, package.json, cliente Prisma y la build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/scripts ./scripts

# Exponer el puerto
EXPOSE 3000

# Comando por defecto para producción
CMD ["npm", "run", "start:prod"]
