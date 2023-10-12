FROM node:16

# Create app directory
WORKDIR api
ADD . /api

# Install app dependencies
RUN yarn

# Build
RUN yarn build

# Run!
EXPOSE 3333

ENTRYPOINT ["yarn", "start"]