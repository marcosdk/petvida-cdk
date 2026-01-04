# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template



# Infraestrutura AWS com AWS CDK

Este projeto utiliza o AWS CDK (Cloud Development Kit) para provisionamento de infraestrutura na AWS utilizando TypeScript.

## Pré-requisitos

- Node.js instalado
- AWS CLI configurado com credenciais válidas
- CDK instalado globalmente:
  ```bash
  npm install -g aws-cdk
  ```

- Instalar dependências do projeto:
  ```bash
  npm install
  ```

## Comandos úteis

### 1. **Deploy de um ambiente específico**

Para fazer o deploy de uma stack em um ambiente (por exemplo, `dev` ou `prod`):

```bash
cdk deploy nomeDaStack -c stage=nomeDoAmbiente
```

#### Exemplo - Deploy do ambiente de produção:
```bash
cdk deploy prod-ApiStack -c stage=prod
```

#### Exemplo - Deploy do ambiente de desenvolvimento:
```bash
cdk deploy dev-ApiStack -c stage=dev
```

> 📌 O parâmetro `-c stage=...` define o ambiente. Pode ser usado para controlar nomes de recursos, variáveis, etc.

### 2. **Deploy de todas as stacks**
```bash
cdk deploy --all -c stage=dev
```

### 3. **Remover infraestrutura (destroy)**

Para destruir uma stack específica:

```bash
cdk destroy nomeDaStack -c stage=nomeDoAmbiente
```

#### Exemplo:
```bash
cdk destroy prod-ApiStack -c stage=prod
```

Para destruir todas as stacks:

```bash
cdk destroy --all -c stage=dev
```

## Organização

- Cada ambiente (`dev`, `prod`, etc.) utiliza os mesmos recursos, com nomes e configurações apropriadas para o ambiente.
- As stacks são nomeadas com o prefixo do ambiente, por exemplo: `dev-ApiStack`, `prod-ApiStack`.

## Observações

- O comando `cdk synth -c stage=prod` pode ser usado para gerar o template CloudFormation antes de aplicar o deploy.
- Verifique se os nomes dos recursos (ex: Lambda, SNS, etc.) são únicos por região e conta, para evitar conflitos entre ambientes.
