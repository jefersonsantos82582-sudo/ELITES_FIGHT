# 🚀 Guia de Implementação - ELITES_FIGHT

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação](#instalação)
4. [Configuração](#configuração)
5. [Integração Mercado Pago](#integração-mercado-pago)
6. [Painel de Administração](#painel-de-administração)
7. [Deploy](#deploy)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este projeto agora inclui:
- ✅ **Integração Mercado Pago** para processar pagamentos
- ✅ **Preços atualizados**: FREE (R$ 0), PRO (R$ 14,99), ELITE (R$ 24,99)
- ✅ **Painel de Administração** completo para gerenciar tudo
- ✅ **Usuário Admin** configurado para você

---

## 📦 Pré-requisitos

- Node.js 16+
- MySQL 5.7+
- Conta Mercado Pago (https://www.mercadopago.com.br)
- Git (opcional)

---

## 🔧 Instalação

### 1. Extrair o Projeto

```bash
# Extrair o arquivo ZIP
unzip elitefight-com-mercado-pago.zip
cd elitefight-novo
```

### 2. Instalar Dependências

```bash
# Instalar dependências
pnpm install

# Ou com npm
npm install
```

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar o arquivo .env com suas credenciais
nano .env
```

Preencha as seguintes variáveis:

```env
# Banco de dados
DATABASE_URL=mysql://usuario:senha@localhost:3306/elitefight

# OAuth
OAUTH_SERVER_URL=https://seu-oauth-server.com
OWNER_OPEN_ID=seu-owner-id

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui

# AWS S3 (opcional)
AWS_ACCESS_KEY_ID=sua_access_key
AWS_SECRET_ACCESS_KEY=sua_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=seu-bucket-name
```

---

## 💾 Configuração do Banco de Dados

### 1. Criar Banco de Dados

```bash
# Conectar ao MySQL
mysql -u root -p

# Criar banco de dados
CREATE DATABASE elitefight CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### 2. Executar Migrations

```bash
# Executar migrations do Drizzle
pnpm db:push

# Ou manualmente
mysql -u usuario -p elitefight < drizzle/0001_grey_lila_cheney.sql
```

### 3. Configurar Admin e Preços

```bash
# Executar script de setup
mysql -u usuario -p elitefight < SETUP_ADMIN.sql
```

Este script:
- ✅ Cria usuário admin com email: `jefersonsantos82582@gmail.com`
- ✅ Atualiza preços dos planos
- ✅ Cria tabela de pagamentos

---

## 💳 Integração Mercado Pago

### 1. Obter Credenciais

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Faça login com sua conta
3. Na seção "Credenciais", copie:
   - **Access Token** (produção)
   - **Public Key** (produção)

### 2. Configurar no .env

```env
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui
```

### 3. Configurar Webhook

1. No painel Mercado Pago, vá para "Webhooks"
2. Configure a URL: `https://seu-dominio.com/trpc/payment.webhook`
3. Selecione os eventos: `payment.created`, `payment.updated`

### 4. Testar Integração

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Acessar http://localhost:3000
# Clicar em "Assinar PRO" ou "Assinar ELITE"
# Completar o checkout
```

---

## 👨‍💼 Painel de Administração

### Acessar o Painel

1. Faça login com: `jefersonsantos82582@gmail.com`
2. Acesse: `http://localhost:3000/admin`

### Funcionalidades

| Seção | Funcionalidade |
|-------|----------------|
| **Visão Geral** | Estatísticas gerais, receita, distribuição de planos |
| **Pagamentos** | Histórico de pagamentos, status, valores |
| **Planos** | Editar preços, descrições dos planos |
| **Usuários** | Listar usuários, planos, suspender/deletar |
| **Modelos** | Gerenciar modelos de planilhas |
| **Configurações** | Mercado Pago, notificações, etc |

### Editar Preços

1. Acesse o painel de admin
2. Clique em "Planos"
3. Clique em "Editar" no plano desejado
4. Altere os preços
5. Clique em "Salvar Alterações"

---

## 🚀 Deploy

### 1. Preparar para Produção

```bash
# Build do projeto
pnpm build

# Testar build localmente
pnpm start
```

### 2. Deploy no Manus

Se você estiver usando Manus:

1. Faça commit das alterações
2. Push para o repositório
3. Acesse o painel Manus
4. Clique em "Deploy"

### 3. Deploy em Servidor Próprio

```bash
# Copiar arquivos para servidor
scp -r elitefight-novo/* usuario@seu-servidor:/var/www/elitefight/

# No servidor:
cd /var/www/elitefight
pnpm install
pnpm build
pnpm start
```

### 4. Configurar HTTPS

```bash
# Usar Let's Encrypt com Certbot
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar no nginx/apache
```

---

## 📊 Estrutura de Arquivos

```
elitefight-novo/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── AdminDashboard.tsx (NOVO - Painel Admin)
│       │   ├── Checkout.tsx (NOVO - Checkout Mercado Pago)
│       │   └── Home.tsx
│       └── components/
│           └── MercadoPagoCheckout.tsx (NOVO)
├── server/
│   ├── services/
│   │   └── mercadoPago.ts (NOVO)
│   ├── routers/
│   │   ├── payment.ts (NOVO)
│   │   └── admin.ts (NOVO)
│   └── db.ts
├── drizzle/
│   └── schema.ts
├── .env.example
├── UPDATE_PRICES.sql
├── SETUP_ADMIN.sql
├── MERCADO_PAGO_INTEGRATION.md
├── ALTERACOES_REALIZADAS.md
└── GUIA_IMPLEMENTACAO.md (ESTE ARQUIVO)
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] Alterar `OWNER_OPEN_ID` para seu ID
- [ ] Configurar HTTPS em produção
- [ ] Usar variáveis de ambiente para todas as credenciais
- [ ] Implementar rate limiting
- [ ] Validar webhooks do Mercado Pago
- [ ] Fazer backup regular do banco de dados
- [ ] Monitorar logs de erro
- [ ] Atualizar dependências regularmente

### Senhas e Tokens

- ✅ Nunca commitar `.env` com credenciais reais
- ✅ Usar `.env.example` como template
- ✅ Rotacionar tokens periodicamente
- ✅ Usar secrets manager em produção

---

## 🐛 Troubleshooting

### Problema: "Mercado Pago não está configurado"

**Solução:**
1. Verificar se `MERCADO_PAGO_ACCESS_TOKEN` está no `.env`
2. Reiniciar o servidor: `pnpm dev`
3. Verificar credenciais no painel Mercado Pago

### Problema: "Acesso negado ao painel admin"

**Solução:**
1. Verificar se o usuário tem `role = 'admin'`
2. Executar: `mysql -u usuario -p elitefight < SETUP_ADMIN.sql`
3. Fazer logout e login novamente

### Problema: "Erro ao conectar ao banco de dados"

**Solução:**
1. Verificar se MySQL está rodando: `mysql -u root -p`
2. Verificar `DATABASE_URL` no `.env`
3. Criar banco de dados: `CREATE DATABASE elitefight;`
4. Executar migrations: `pnpm db:push`

### Problema: "Webhook não está sendo recebido"

**Solução:**
1. Verificar URL do webhook no painel Mercado Pago
2. Usar ngrok para testar localmente: `ngrok http 3000`
3. Configurar webhook com URL do ngrok
4. Verificar logs do servidor

---

## 📞 Suporte

### Documentação
- [Mercado Pago Docs](https://www.mercadopago.com.br/developers/pt/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [tRPC](https://trpc.io/)

### Contato
- Email: seu-email@exemplo.com
- Comunidade: [Mercado Pago Community](https://www.mercadopago.com.br/developers/pt/community)

---

## ✅ Checklist de Implementação

- [ ] Extrair projeto
- [ ] Instalar dependências
- [ ] Configurar `.env`
- [ ] Criar banco de dados
- [ ] Executar migrations
- [ ] Executar SETUP_ADMIN.sql
- [ ] Obter credenciais Mercado Pago
- [ ] Configurar variáveis Mercado Pago
- [ ] Testar checkout
- [ ] Testar painel admin
- [ ] Configurar webhook
- [ ] Fazer build
- [ ] Deploy em produção

---

## 🎉 Próximos Passos

1. **Personalizar branding**
   - Alterar cores e logos
   - Adicionar favicon

2. **Adicionar mais funcionalidades**
   - Cupons de desconto
   - Assinatura recorrente
   - Histórico de transações

3. **Otimizar performance**
   - Cache de dados
   - Compressão de imagens
   - CDN

4. **Melhorar SEO**
   - Meta tags
   - Sitemap
   - Schema markup

---

**Versão:** 1.0.0  
**Última atualização:** 18 de Julho de 2026  
**Status:** ✅ Pronto para produção
