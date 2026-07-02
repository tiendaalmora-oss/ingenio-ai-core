# Base image
FROM node:20.20.2-alpine AS builder

WORKDIR /app

# Archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (necesario para compilar)
RUN npm install

# Copiar el código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar NestJS
RUN npm run build

# --- Imagen final (más ligera) ---
FROM node:20.20.2-alpine

WORKDIR /app

# Copiar dependencias de producción, package.json, cliente Prisma y la build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exponer el puerto
EXPOSE 3000

# Comando por defecto para producción
CMD ["npm", "run", "start:prod"]
