# 💳 Integração Mercado Pago - ELITES_FIGHT

## Visão Geral

Este documento descreve como integrar o Mercado Pago ao projeto ELITES_FIGHT para processar pagamentos dos planos PRO e ELITE.

## 📋 Pré-requisitos

1. **Conta Mercado Pago**: Crie uma conta em https://www.mercadopago.com.br
2. **Credenciais**: Obtenha seu Access Token e Public Key no painel de desenvolvedores
3. **Node.js**: Versão 16+ instalada

## 🔧 Configuração

### 1. Obter Credenciais do Mercado Pago

1. Acesse https://www.mercadopago.com.br/developers/panel
2. Faça login com sua conta
3. Na seção "Credenciais", copie:
   - **Access Token** (produção)
   - **Public Key** (produção)
   - Para testes, use as credenciais de sandbox

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui
```

### 3. Instalar Dependências

Se necessário, instale o axios (já incluído no projeto):

```bash
pnpm install axios
```

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

1. **`server/services/mercadoPago.ts`**
   - Serviço de integração com Mercado Pago
   - Métodos para criar preferências de pagamento
   - Processamento de webhooks

2. **`server/routers/payment.ts`**
   - Rotas TRPC para gerenciamento de pagamentos
   - Endpoints para criar preferências
   - Webhook para notificações

3. **`client/src/components/MercadoPagoCheckout.tsx`**
   - Componente React para checkout
   - Integra o SDK do Mercado Pago

4. **`client/src/pages/Checkout.tsx`**
   - Página de checkout completa
   - Exibe informações do plano
   - Integra o componente de pagamento

5. **`UPDATE_PRICES.sql`**
   - Script SQL para atualizar preços
   - FREE: R$ 0
   - PRO: R$ 14,99
   - ELITE: R$ 24,99

## 🚀 Implementação

### Passo 1: Atualizar os Preços no Banco de Dados

Execute o script SQL para atualizar os preços:

```bash
# Conecte ao seu banco de dados e execute:
mysql -u seu_usuario -p seu_banco < UPDATE_PRICES.sql
```

Ou execute manualmente:

```sql
UPDATE `plans` SET `priceMonthly` = '0' WHERE `code` = 'free';
UPDATE `plans` SET `priceMonthly` = '14.99' WHERE `code` = 'pro';
UPDATE `plans` SET `priceMonthly` = '24.99' WHERE `code` = 'elite';
```

### Passo 2: Integrar as Rotas de Pagamento

Adicione as rotas de pagamento ao arquivo `server/routers.ts`:

```typescript
import { paymentRouter } from "./routers/payment";

export const appRouter = router({
  // ... outras rotas
  payment: paymentRouter,
});
```

### Passo 3: Adicionar a Página de Checkout

Adicione a rota de checkout ao `client/src/App.tsx`:

```typescript
import Checkout from "./pages/Checkout";

// Na função Router:
<Route path="/checkout" component={Checkout} />
```

### Passo 4: Atualizar a Página Home

Modifique o `client/src/pages/Home.tsx` para redirecionar para o checkout:

```typescript
// Ao clicar no botão de plano pago:
onClick={() => {
  if (user) {
    setLocation(`/checkout?plan=${plan.code}`);
  } else {
    startLogin();
  }
}}
```

## 🔐 Segurança

### Validação de Webhook

Para validar webhooks do Mercado Pago, implemente verificação de assinatura:

```typescript
// Adicione ao método processWebhookNotification
const signature = headers['x-signature'];
const timestamp = headers['x-timestamp'];
const hmac = crypto
  .createHmac('sha256', process.env.MERCADO_PAGO_WEBHOOK_SECRET!)
  .update(`${timestamp}.${JSON.stringify(body)}`)
  .digest('hex');

if (hmac !== signature) {
  throw new Error('Assinatura de webhook inválida');
}
```

### Proteção de Dados

- Nunca exponha o Access Token no frontend
- Use variáveis de ambiente para credenciais
- Valide todos os pagamentos no backend
- Implemente rate limiting nos endpoints de pagamento

## 📊 Fluxo de Pagamento

```
1. Usuário clica em "Assinar PRO/ELITE"
   ↓
2. Redireciona para /checkout?plan=pro
   ↓
3. Frontend chama trpc.payment.createUpgradePreference
   ↓
4. Backend cria preferência no Mercado Pago
   ↓
5. Mercado Pago retorna preferenceId
   ↓
6. Frontend renderiza checkout com MercadoPagoCheckout
   ↓
7. Usuário completa pagamento
   ↓
8. Mercado Pago envia webhook para /trpc/payment.webhook
   ↓
9. Backend atualiza plano do usuário
   ↓
10. Usuário é redirecionado para /checkout/success
```

## 🧪 Testes

### Testar em Sandbox

1. Use credenciais de sandbox do Mercado Pago
2. Cartões de teste disponíveis em: https://www.mercadopago.com.br/developers/pt/guides/resources/localization/locales

Cartão de teste (aprovado):
- Número: 4111 1111 1111 1111
- Vencimento: 11/25
- CVV: 123

### Testar Webhook Localmente

Use o ngrok para expor seu servidor local:

```bash
ngrok http 3000
```

Configure a URL de webhook no painel do Mercado Pago com a URL do ngrok.

## 📝 Próximos Passos

1. **Implementar Confirmação de Pagamento**
   - Atualizar plano do usuário após pagamento bem-sucedido
   - Enviar email de confirmação

2. **Adicionar Histórico de Transações**
   - Criar tabela de transações no banco
   - Exibir histórico no dashboard

3. **Implementar Cancelamento de Assinatura**
   - Permitir que usuários cancelem planos
   - Integrar com API de assinatura do Mercado Pago

4. **Adicionar Suporte a Cupons**
   - Integrar cupons de desconto
   - Aplicar desconto na preferência de pagamento

5. **Melhorar Tratamento de Erros**
   - Implementar retry logic
   - Adicionar logging detalhado

## 📞 Suporte

Para dúvidas sobre a integração:
- Documentação Mercado Pago: https://www.mercadopago.com.br/developers/pt/docs
- Comunidade: https://www.mercadopago.com.br/developers/pt/community

## 📄 Licença

Este código é parte do projeto ELITES_FIGHT.
