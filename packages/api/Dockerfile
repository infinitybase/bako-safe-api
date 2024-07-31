FROM arm64v8/node:22-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Create the application directory
WORKDIR /api

# Add the application content to the working directory
ADD . /api

# Install the application dependencies using pnpm
RUN pnpm install

# Build the application
RUN pnpm build

# Expose the application port
EXPOSE 3333

# Start the application
ENTRYPOINT ["pnpm", "start"]
