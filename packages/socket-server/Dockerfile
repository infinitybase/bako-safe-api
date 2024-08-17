FROM arm64v8/node:18.18.2-alpine

# Create app directory
WORKDIR /socket
ADD . /socket

# Install pnpm
RUN npm install -g pnpm

# Install app dependencies
RUN pnpm install

# Build the application
RUN pnpm build

# Expose application port
EXPOSE 3001

# Start the application
ENTRYPOINT ["pnpm", "start"]
