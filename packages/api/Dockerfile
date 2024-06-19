FROM node:18.18.2

# Create app directory
WORKDIR /api
ADD . /api

# Install pnpm
RUN npm install -g pnpm

# Install app dependencies
RUN pnpm install

# Build
RUN pnpm run build

# Install pm2
RUN pnpm add pm2 -g

# Run!
EXPOSE 3333

ENTRYPOINT ["pnpm", "start"]