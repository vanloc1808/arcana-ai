FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY patches ./patches
RUN npm ci && npx patch-package

# Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Add build argument for API URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY patches ./patches
COPY . .
# Patches should already be applied from deps stage, but verify
RUN test -d patches && npx patch-package || echo "No patches to apply"
RUN npm run build

# Serve using Next.js built-in server
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
