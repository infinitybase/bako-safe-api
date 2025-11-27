# syntax=docker/dockerfile:1.4
FROM arm64v8/node:18-bookworm AS builder

# Bookworm already has python3/make/g++ - no need to install
# Build trigger: 2024-11-27
# Install pnpm globally
RUN npm install -g pnpm

# Create the application directory
WORKDIR /api

# Copy only package.json first (better layer caching)
COPY package.json ./

# Install dependencies with cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install

# Copy source code after dependencies are installed
COPY . .

# Build the application (excluding tests)
RUN pnpm build:prod

# Production stage - smaller final image
FROM arm64v8/node:18.18.2-alpine AS production

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /api

# Copy package.json
COPY package.json ./

# Install only production dependencies with cache mount
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /api/build ./build

# Expose the application port
EXPOSE 3333

# Start the application
ENTRYPOINT ["pnpm", "start"]
