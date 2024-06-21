FROM arm64v8/node:18.18.2-alpine

# Create app directory
WORKDIR api
ADD . /api

# Install app dependencies
RUN npm install

# Install pm2
RUN npm global add pm2

# Build
RUN npm build

# Run!
EXPOSE 3333

ENTRYPOINT ["npm", "run", "start"]