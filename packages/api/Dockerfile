# syntax=docker/dockerfile:1.4
FROM arm64v8/node:18.18.2-alpine AS builder

# Install dependencies necessary for node-gyp
RUN apk add --no-cache python3 make g++ \
    && npm install -g node-gyp

# Install pnpm globally
RUN npm install -g pnpm

# Create the application directory
WORKDIR /api

# Copy only package files first (better layer caching)
COPY package.json pnpm-lock.yaml ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code after dependencies are installed
COPY . .

# Build the application
RUN pnpm build

# Production stage - smaller final image
FROM arm64v8/node:18.18.2-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /api

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /api/build ./build

# Expose the application port
EXPOSE 3333

# Start the application
ENTRYPOINT ["pnpm", "start"]
