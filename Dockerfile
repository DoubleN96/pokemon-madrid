# Build estático del juego + nginx
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# CACHE_BUST: cambiar este valor fuerza un rebuild limpio del bundle.
# (Coolify reusaba una imagen Docker cacheada y servía código viejo — 2026-06-13)
ARG CACHE_BUST=2026-06-13-fix-menupc
RUN echo "build $CACHE_BUST" && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
