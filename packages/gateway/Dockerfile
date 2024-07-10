FROM arm64v8/node:18.18.2-buster-slim

# Create app directory
WORKDIR /gateway
ADD . /gateway

# Install app dependencies
RUN yarn install

# Build
RUN yarn build

# Expose the application port
EXPOSE 4444

# Start the application
ENTRYPOINT ["yarn", "start"]
