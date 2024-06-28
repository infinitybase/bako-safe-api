FROM arm64v8/node:18.18.2-alpine

# Create app directory
WORKDIR socket
ADD . /socket

# Install app dependencies
RUN yarn install

# Install pm2
RUN yarn global add pm2

# Build
RUN yarn build

# Run!
EXPOSE 3001

ENTRYPOINT ["yarn", "start"]
