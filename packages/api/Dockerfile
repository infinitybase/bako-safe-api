FROM arm64v8/node:18.18.2-alpine

# Create app directory
WORKDIR api
ADD . /api

# Install app dependencies
RUN yarn install

# Install pm2
RUN yarn global add pm2

# Build
RUN yarn build

# Run!
EXPOSE 3333

ENTRYPOINT ["yarn", "start"]