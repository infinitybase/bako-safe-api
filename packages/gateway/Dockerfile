FROM arm64v8/node:18.18.2-alpine

# Create app directory
WORKDIR /gateway
ADD . /gateway

# Install node-gyp
RUN yarn global add node-gyp && yarn install --frozen-lockfile

# Install app dependencies
RUN yarn install

# Build
RUN yarn build

# Expose the application port
EXPOSE 4444

# Start the application
ENTRYPOINT ["yarn", "start"]