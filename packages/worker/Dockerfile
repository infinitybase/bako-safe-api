# syntax=docker/dockerfile:1.4
FROM node:22-bookworm AS builder

# Bookworm already has python3/make/g++ - no need to install
# Install pnpm globally
RUN npm install -g pnpm

# Create the application directory
WORKDIR /api

# Copy only package.json first (better layer caching)
COPY package.json ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm-worker,target=/root/.local/share/pnpm/store \
    pnpm install

# Copy source code after dependencies are installed
COPY . .

# Build the application
RUN pnpm build

# Production stage - smaller final image
FROM node:22-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /api

# Copy package.json
COPY package.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,id=pnpm-worker,target=/root/.local/share/pnpm/store \
    pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /api/dist ./dist

# Expose the application port
EXPOSE 3063

# Start the application
ENTRYPOINT ["pnpm", "start"]
