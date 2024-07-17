FROM arm64v8/node:18.18.2-alpine

# Instalar dependências necessárias para node-gyp
RUN apk add --no-cache python3 make g++ \
    && npm install -g node-gyp

# Criar diretório da aplicação
WORKDIR /gateway
ADD . /gateway

# Instalar dependências da aplicação
RUN yarn install

# Build
RUN yarn build

# Expor a porta da aplicação
EXPOSE 4444

# Iniciar a aplicação
ENTRYPOINT ["yarn", "start"]
