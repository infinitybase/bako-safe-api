FROM node:18.18.2

# Define o diretório de trabalho
WORKDIR /api

# Instala as dependências
RUN yarn install

# Copia o restante dos arquivos do projeto
COPY . .

# Install pm2
RUN yarn global add pm2

# Compila o aplicativo
RUN yarn build

# Expõe a porta que o aplicativo utiliza
EXPOSE 3001

# Define o comando para iniciar o aplicativo
ENTRYPOINT ["yarn", "start"]
