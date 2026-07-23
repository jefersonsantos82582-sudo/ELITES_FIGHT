# 🚀 Guia de Configuração no Render

Este guia explica como configurar todas as variáveis de ambiente necessárias para o ELITES_FIGHT funcionar corretamente no Render.

## 📋 Variáveis de Ambiente Necessárias

### 1. **VITE_MERCADO_PAGO_PUBLIC_KEY** ⭐ CRÍTICA
- **O que é:** Chave pública do Mercado Pago para o frontend
- **Onde obter:** [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel)
- **Formato:** Começa com `APP_USR-` seguido de números
- **Exemplo:** `APP_USR-1234567890abcdef`
- **Por que é crítica:** Sem isso, o checkout não funciona

### 2. **MERCADO_PAGO_ACCESS_TOKEN** ⭐ CRÍTICA
- **O que é:** Token de acesso do Mercado Pago para o backend
- **Onde obter:** [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel)
- **Formato:** Começa com `APP_USR-` (diferente da chave pública)
- **Por que é crítica:** Necessário para criar preferências de pagamento

### 3. **ADMIN_KEY** ⭐ CRÍTICA
- **O que é:** Chave de acesso para o painel administrativo
- **Formato:** Mínimo 8 caracteres, deve ser forte e única
- **Exemplo:** `aB3$xK9@mL2#pQ7!rT5&vW8*yZ1(`
- **Como usar:** Digite esta chave na tela de login do painel admin
- **Por que é crítica:** Protege seu painel administrativo

### 4. **DATABASE_URL** ⭐ CRÍTICA
- **O que é:** String de conexão do PostgreSQL
- **Formato:** `postgresql://usuario:senha@host:porta/banco_de_dados`
- **Onde obter:** Seu provedor de banco de dados (Render, Railway, etc)
- **Por que é crítica:** Sem isso, o banco de dados não funciona

### 5. **FIREBASE_SERVICE_ACCOUNT** ⭐ CRÍTICA
- **O que é:** Credenciais do Firebase em formato JSON
- **Onde obter:** [Firebase Console](https://console.firebase.google.com)
- **Como obter:**
  1. Vá para Configurações do Projeto
  2. Clique em "Contas de Serviço"
  3. Clique em "Gerar nova chave privada"
  4. Copie todo o JSON
- **Por que é crítica:** Necessário para autenticação e acesso ao Firebase

### 6. **GOOGLE_CLIENT_SECRET** ⭐ CRÍTICA
- **O que é:** Segredo do Google OAuth
- **Onde obter:** [Google Cloud Console](https://console.cloud.google.com)
- **Por que é crítica:** Necessário para login com Google

### 7. **FIREBASE_PROJECT_ID** (Opcional)
- **O que é:** ID do projeto Firebase
- **Formato:** Nome do seu projeto Firebase
- **Exemplo:** `elites-fight`

## 🔧 Como Configurar no Render

### Passo 1: Acessar o Dashboard
1. Vá para [render.com](https://render.com)
2. Faça login na sua conta
3. Clique no seu serviço `elites-fight`

### Passo 2: Acessar as Variáveis de Ambiente
1. Clique em **"Environment"** no menu lateral
2. Você verá uma tabela com as variáveis existentes

### Passo 3: Adicionar/Editar Variáveis
Para cada variável que precisa ser configurada:

1. Se a variável **já existe**, clique no ícone de edição (lápis)
2. Se a variável **não existe**, clique em **"+ Add Variable"**
3. Preencha:
   - **Key:** Nome exato da variável (ex: `VITE_MERCADO_PAGO_PUBLIC_KEY`)
   - **Value:** O valor da variável
4. Clique em **"Save"**

### Passo 4: Fazer Deploy
Após adicionar/editar as variáveis:
1. Clique em **"Deploy"** ou aguarde o deploy automático
2. Verifique os logs para erros

## ✅ Checklist de Configuração

- [ ] `VITE_MERCADO_PAGO_PUBLIC_KEY` - Chave pública do Mercado Pago
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` - Token de acesso do Mercado Pago
- [ ] `ADMIN_KEY` - Chave de acesso do painel (mínimo 8 caracteres)
- [ ] `DATABASE_URL` - String de conexão PostgreSQL
- [ ] `FIREBASE_SERVICE_ACCOUNT` - JSON completo das credenciais
- [ ] `GOOGLE_CLIENT_SECRET` - Segredo do Google OAuth
- [ ] `FIREBASE_PROJECT_ID` - ID do projeto Firebase

## 🧪 Como Testar

### Teste 1: Verificar Variáveis
1. Abra o console do navegador (F12)
2. Procure por mensagens de erro sobre variáveis faltando
3. Se tudo estiver configurado, não haverá avisos

### Teste 2: Acessar o Painel Admin
1. Vá para `https://seu-dominio/admin`
2. Digite a `ADMIN_KEY` que você configurou
3. Se funcionar, o painel carrega

### Teste 3: Fazer um Checkout
1. Faça login
2. Vá para `/checkout?plan=pro`
3. Verifique se as formas de pagamento carregam

## 🆘 Solução de Problemas

### "VITE_MERCADO_PAGO_PUBLIC_KEY não está configurada"
- ✅ Adicione a variável no Render
- ✅ Certifique-se de que começa com `APP_USR-`
- ✅ Faça deploy novamente

### "Erro ao criar preferência de pagamento"
- ✅ Verifique se `MERCADO_PAGO_ACCESS_TOKEN` está correto
- ✅ Verifique se o token não expirou
- ✅ Tente gerar um novo token

### "Erro de autenticação / Please login (10001)"
- ✅ Verifique se `FIREBASE_SERVICE_ACCOUNT` está correto
- ✅ Certifique-se de que é um JSON válido (sem quebras de linha extras)
- ✅ Verifique se `GOOGLE_CLIENT_SECRET` está configurado

### "Erro ao conectar ao banco de dados"
- ✅ Verifique se `DATABASE_URL` está correto
- ✅ Certifique-se de que o banco de dados está online
- ✅ Teste a conexão localmente

## 📝 Notas Importantes

1. **Nunca compartilhe suas variáveis de ambiente** - Elas contêm segredos
2. **Use valores diferentes em produção e desenvolvimento** - Nunca reutilize chaves
3. **Altere a `ADMIN_KEY` regularmente** - Por segurança
4. **Mantenha os tokens atualizados** - Alguns tokens expiram

## 🔗 Links Úteis

- [Documentação do Render](https://render.com/docs)
- [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
- [Firebase Console](https://console.firebase.google.com)
- [Google Cloud Console](https://console.cloud.google.com)

---

**Última atualização:** 2024
**Versão:** 1.0
