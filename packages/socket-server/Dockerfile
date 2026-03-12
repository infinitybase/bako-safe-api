# syntax=docker/dockerfile:1.4
FROM node:22-bookworm AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Create the application directory
WORKDIR /socket

# Copy only package.json first (better layer caching)
COPY package.json ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm-socket,target=/root/.local/share/pnpm/store \
    pnpm install

# Copy source code after dependencies are installed
COPY . .

# Build the application
RUN pnpm build

# Production stage - smaller final image
FROM node:22-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /socket

# Copy package.json
COPY package.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,id=pnpm-socket,target=/root/.local/share/pnpm/store \
    pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /socket/build ./build

# Expose application port
EXPOSE 3001

# Start the application
ENTRYPOINT ["pnpm", "start"]
