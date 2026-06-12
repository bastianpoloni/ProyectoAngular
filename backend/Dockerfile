# Dockerfile para Backend
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar archivos fuente del backend
COPY . .

# Exponer el puerto
EXPOSE 3000

# Ejecutar el servidor en modo de producción
CMD ["node", "server.js"]
