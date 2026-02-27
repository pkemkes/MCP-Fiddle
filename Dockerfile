# Stage 1 — Build
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_VERSION=0.0.0
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

# Build frontend (Vite) and backend (TypeScript)
RUN npm run build

# Stage 2 — Runtime
FROM node:22-alpine AS runtime

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend assets
COPY --from=build /app/dist ./dist

# Copy compiled backend
COPY --from=build /app/dist-server ./dist-server

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist-server/index.js"]
