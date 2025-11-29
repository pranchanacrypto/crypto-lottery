# 🌐 Configuração do Deploy Automático no Pinata

Este repositório está configurado para fazer deploy automático do frontend no IPFS usando Pinata.

## 📋 Pré-requisitos

1. Conta no [Pinata](https://app.pinata.cloud)
2. API Keys do Pinata

## 🔑 Como Configurar os Secrets no GitHub

### Passo 1: Obter as API Keys do Pinata

1. Acesse [https://app.pinata.cloud](https://app.pinata.cloud)
2. Faça login na sua conta
3. Clique em **API Keys** no menu lateral
4. Clique em **New Key**
5. Configure as permissões:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
   - ✅ `pinByHash` (opcional)
6. Dê um nome descritivo (ex: "GitHub Actions - Crypto Lottery")
7. Clique em **Create Key**
8. **IMPORTANTE**: Copie a **API Key** e **API Secret** imediatamente (você só verá isso uma vez!)

### Passo 2: Adicionar Secrets no GitHub

1. Vá para o repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Secrets and variables** → **Actions**
4. Clique em **New repository secret**
5. Adicione os seguintes secrets:

#### Secret 1: PINATA_API_KEY
- **Name**: `PINATA_API_KEY`
- **Secret**: Cole a API Key que você copiou do Pinata
- Clique em **Add secret**

#### Secret 2: PINATA_SECRET_KEY
- **Name**: `PINATA_SECRET_KEY`
- **Secret**: Cole a API Secret que você copiou do Pinata
- Clique em **Add secret**

## 🚀 Como Funciona

O workflow será executado automaticamente quando:

1. **Push na branch `main`** com mudanças na pasta `frontend/`
2. **Pull Request** com mudanças na pasta `frontend/` (cria preview)
3. **Execução manual** via GitHub Actions

### Processo de Deploy

1. ✅ Faz checkout do código
2. ✅ Instala Node.js e dependências
3. ✅ Faz build do frontend (`npm run build`)
4. ✅ Faz upload da pasta `dist/` para o Pinata
5. ✅ Retorna o CID (Content Identifier) do IPFS
6. ✅ Cria resumo com links de acesso

## 📍 Acessando o Frontend Deployado

Após o deploy bem-sucedido, você pode acessar o frontend via:

- **Pinata Gateway**: `https://gateway.pinata.cloud/ipfs/{CID}`
- **IPFS Gateway**: `https://ipfs.io/ipfs/{CID}`
- **Cloudflare Gateway**: `https://cloudflare-ipfs.com/ipfs/{CID}`

O **CID** será exibido nos logs do workflow e no resumo da execução.

## 🔍 Verificando o Deploy

1. Vá para a aba **Actions** no GitHub
2. Clique no workflow **"Deploy Frontend to Pinata"**
3. Veja o status da execução
4. No resumo, você encontrará:
   - 🔗 CID do IPFS
   - 🔗 Links para acessar o site
   - 📊 Informações do build

## 🐛 Troubleshooting

### Deploy falhou com erro de autenticação
- Verifique se os secrets estão configurados corretamente
- Confirme que a API Key do Pinata está ativa

### Build falhou
- Verifique os logs do build no GitHub Actions
- Teste localmente: `cd frontend && npm ci && npm run build`

### CID não está sendo extraído
- Verifique se o upload para Pinata foi bem-sucedido
- Verifique os logs da etapa "Upload to Pinata"

## 📚 Recursos Adicionais

- [Documentação do Pinata](https://docs.pinata.cloud/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [IPFS Docs](https://docs.ipfs.tech/)

## ⚙️ Customização

Para modificar o workflow, edite o arquivo `.github/workflows/deploy-pinata.yml`.

Você pode:
- Alterar a branch de deploy
- Adicionar notificações (Slack, Discord, etc.)
- Configurar domínio customizado
- Adicionar testes antes do deploy

