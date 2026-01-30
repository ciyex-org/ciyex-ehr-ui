# Build stage
FROM node:24-alpine AS builder

# Build argument for environment (dev, stage, prod)
ARG ENVIRONMENT=stage

# Install pnpm
RUN npm install -g pnpm@9

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Install dependencies (allow lock file to be updated if needed)
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Copy env file based on environment
RUN if [ -f ".env.${ENVIRONMENT}" ]; then cp .env.${ENVIRONMENT} .env.local; fi

# Build the application (Next.js 16 uses Turbopack by default)
RUN pnpm run build

# Production stage
FROM node:24-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Set environment to production
ENV NODE_ENV=production

# Copy package files and lock from builder (ensures sync)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml* ./

# Install only production dependencies
RUN pnpm install --prod --no-frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["pnpm", "start"]
