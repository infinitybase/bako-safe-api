FROM arm64v8/node:22-alpine

# Create app directory
WORKDIR /socket
ADD . /socket

# Install pnpm
RUN npm install -g pnpm

# Install system dependencies
RUN apk add --no-cache wget

# Install app dependencies
RUN pnpm install

# Build the application
RUN pnpm build

# Expose application port
EXPOSE 3001

# Start the application
ENTRYPOINT ["pnpm", "start"]
