FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
ENTRYPOINT []
CMD ["/bin/sh", "-c", "echo \"PORT=${PORT}\" && exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile"]
