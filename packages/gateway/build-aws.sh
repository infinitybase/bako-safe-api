aws ecr get-login-password --region us-east-1 --profile infinitybase-jota | docker login --username AWS --password-stdin 392170836981.dkr.ecr.us-east-1.amazonaws.com
docker buildx build --platform linux/arm64 --push -t 392170836981.dkr.ecr.us-east-1.amazonaws.com/bako-safe-gateway-api-hmg:v1 .