FROM node:18.18.2

# Create app directory
WORKDIR api
ADD . /api

# Install app dependencies
RUN pnpm install

# Install pm2
RUN pnpm global add pm2

# Build
RUN pnpm build

# Run!
EXPOSE 3333

ENTRYPOINT ["yarn", "start"]
