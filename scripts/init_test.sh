#!/bin/bash

# Função para encerrar processos iniciados pelo script
cleanup() {
  echo "Encerrando processos..."
  
  # Encerra o processo do servidor de desenvolvimento (ajuste conforme necessário)
  if [ ! -z "$DEV_PID" ]; then
    kill $DEV_PID
  fi
  
  # Encerra todos os containers Docker ativos
  echo "Parando todos os containers Docker ativos..."
  docker stop $(docker ps -q)
  docker container prune --filter "label=environment=test"
  docker image prune -a --filter "label=environment=test"
  rm -r ./docker/database/postgresqltest

  # Adicione comandos adicionais de limpeza, se necessário
}

# Captura sinais de INT e TERM e chama a função cleanup
trap cleanup INT TERM

# Inicializa o banco de dados para testes
yarn database:test
yarn chain:start

# Aguarda um momento para assegurar que o banco de dados está pronto
sleep 10

# Executa as migrações do banco de dados ou outra preparação necessária
yarn dev &
# Salva o PID do processo de desenvolvimento
DEV_PID=$!

# Espera um momento para garantir que a aplicação está rodando
sleep 20

# Executa os testes Jest
NODE_ENV=test node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand

# Limpa e encerra os processos antes de sair
cleanup

# Sai do script
exit 0