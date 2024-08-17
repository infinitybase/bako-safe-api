FROM arm64v8/node:20-alpine

# Install dependencies necessary for node-gyp
RUN apk add --no-cache python3 make g++ \
    && npm install -g node-gyp

# Install pnpm
RUN npm install -g pnpm

# Create the application directory
WORKDIR /gateway
ADD . /gateway

# Install application dependencies
RUN pnpm install

# Build the application
RUN pnpm build

# Expose the application port
EXPOSE 4444

# Start the application
ENTRYPOINT ["pnpm", "start"]
