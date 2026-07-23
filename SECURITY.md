# Guia de Segurança - ELITES_FIGHT

Este documento descreve as práticas de segurança implementadas e recomendações para manter a aplicação segura.

## 🔐 Autenticação e Autorização

### Firebase Authentication
- A autenticação é feita via Google OAuth através do Firebase
- Tokens ID do Firebase são validados no backend
- Tokens são armazenados em localStorage e cookies com `SameSite=Strict`

### Admin Panel Security
- O painel administrativo requer uma chave de acesso (`ADMIN_KEY`)
- A chave é validada via middleware tRPC
- Suporte para autenticação por email autorizado
- Cookies admin usam `SameSite=Strict; Secure` em produção

## 🛡️ Variáveis de Ambiente

### Nunca commitar segredos no repositório!

**Variáveis que DEVEM estar em `.env.local` ou no Render:**
- `FIREBASE_SERVICE_ACCOUNT` - Credenciais do Firebase
- `DATABASE_URL` - String de conexão do banco de dados
- `MERCADO_PAGO_ACCESS_TOKEN` - Token de acesso do Mercado Pago
- `GOOGLE_CLIENT_SECRET` - Segredo do Google OAuth
- `ADMIN_KEY` - Chave de acesso do painel administrativo
- `AWS_SECRET_ACCESS_KEY` - Chave secreta da AWS

**Variáveis públicas (seguro commitar):**
- `FIREBASE_PROJECT_ID`
- `VITE_MERCADO_PAGO_PUBLIC_KEY` (começa com `VITE_`)
- `GOOGLE_CLIENT_ID`
- `NODE_ENV`

## 📋 Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Verificar que `render.yaml` não contém valores hardcoded de segredos
- [ ] Configurar todas as variáveis de ambiente no Render:
  - `FIREBASE_SERVICE_ACCOUNT`
  - `DATABASE_URL`
  - `MERCADO_PAGO_ACCESS_TOKEN`
  - `GOOGLE_CLIENT_SECRET`
  - `ADMIN_KEY` (chave forte, mínimo 8 caracteres)
- [ ] Usar HTTPS em produção
- [ ] Configurar CORS corretamente
- [ ] Revisar permissões de banco de dados
- [ ] Testar autenticação e autorização

## 🔑 Gerenciamento de Chaves

### ADMIN_KEY
- Deve ter no mínimo 8 caracteres
- Use uma chave forte e aleatória em produção
- Altere regularmente
- Nunca compartilhe via email ou chat

Exemplo de chave forte:
```
ADMIN_KEY=aB3$xK9@mL2#pQ7!rT5&vW8*yZ1(
```

## 🚨 Segurança do Painel Admin

O painel administrativo (`/admin`) é protegido por:

1. **Autenticação Firebase** - Usuário deve estar logado
2. **Chave de Acesso** - Requer `ADMIN_KEY` válida
3. **Email Autorizado** - Suporte para lista de emails admin
4. **Role-based Access** - Usuários com `role: admin` no banco

## 🔄 Fluxo de Autenticação

```
1. Usuário faz login com Google (Firebase)
2. Firebase retorna ID Token
3. Token é armazenado em localStorage e cookie
4. Cada requisição tRPC envia o token no header `Authorization: Bearer <token>`
5. Backend valida o token com Firebase Admin SDK
6. Usuário é sincronizado no banco de dados
7. Acesso a procedimentos protegidos é concedido
```

## 🛡️ Proteção Contra Ataques Comuns

### CSRF (Cross-Site Request Forgery)
- Cookies usam `SameSite=Strict`
- tRPC usa `credentials: 'include'` apenas para requisições same-origin

### XSS (Cross-Site Scripting)
- React sanitiza automaticamente conteúdo renderizado
- Inputs são validados com Zod no backend
- Não há `dangerouslySetInnerHTML` sem sanitização

### SQL Injection
- Drizzle ORM previne SQL injection
- Todas as queries usam prepared statements

### Timing Attacks
- Validação de chave de admin usa comparação simples (pode ser melhorada com `crypto.timingSafeEqual`)

## 📝 Logs e Monitoramento

- Erros de autenticação são logados no console
- Tentativas de acesso admin não autorizado são logadas
- Monitore logs em produção regularmente

## 🔄 Atualizações de Segurança

- Mantenha dependências atualizadas: `npm audit fix`
- Revise regularmente o código de autenticação
- Teste cenários de segurança periodicamente

## 📞 Reportar Vulnerabilidades

Se encontrar uma vulnerabilidade de segurança:
1. NÃO publique em issues públicas
2. Envie um email privado para o desenvolvedor
3. Descreva a vulnerabilidade e como reproduzi-la
4. Aguarde resposta antes de divulgar

---

**Última atualização:** 2024
**Versão:** 1.0
