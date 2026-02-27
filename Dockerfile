# Stage 1 — Install dependencies and build
FROM node:25-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_APP_VERSION=0.0.0
ENV VITE_APP_VERSION=${VITE_APP_VERSION}

# Build frontend (Vite) and backend (TypeScript)
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --omit=dev

# Stage 2 — Runtime
FROM node:25-alpine AS runtime

WORKDIR /app

# Copy production node_modules (already pruned)
COPY --from=build /app/node_modules ./node_modules

# Copy built frontend assets
COPY --from=build /app/dist ./dist

# Copy compiled backend
COPY --from=build /app/dist-server ./dist-server

COPY --from=build /app/package.json ./

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist-server/index.js"]
