# ⚡ ELITES_FIGHT - Guia Rápido

## 🎯 O que foi feito?

✅ **Integração Mercado Pago** - Processamento de pagamentos  
✅ **Preços Atualizados** - FREE (R$ 0), PRO (R$ 14,99), ELITE (R$ 24,99)  
✅ **Painel Admin** - Gerenciar tudo pelo navegador  
✅ **Usuário Admin** - Seu email já está configurado  

---

## 🚀 Começar em 5 Minutos

### 1. Extrair e Instalar
```bash
unzip elitefight-com-mercado-pago.zip
cd elitefight-novo
pnpm install
```

### 2. Configurar Banco de Dados
```bash
# Criar banco
mysql -u root -p
CREATE DATABASE elitefight;
EXIT;

# Executar migrations
pnpm db:push

# Configurar admin e preços
mysql -u usuario -p elitefight < SETUP_ADMIN.sql
```

### 3. Configurar Mercado Pago
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env e adicionar:
MERCADO_PAGO_ACCESS_TOKEN=seu_token
VITE_MERCADO_PAGO_PUBLIC_KEY=sua_chave
```

### 4. Iniciar Servidor
```bash
pnpm dev
```

Pronto! Acesse http://localhost:3000

---

## 🔑 Suas Credenciais

**Email Admin:** jefersonsantos82582@gmail.com  
**Plano:** ELITE  
**Acesso Admin:** http://localhost:3000/admin

---

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `GUIA_IMPLEMENTACAO.md` | Guia completo e detalhado |
| `MERCADO_PAGO_INTEGRATION.md` | Documentação Mercado Pago |
| `SETUP_ADMIN.sql` | Script para configurar admin |
| `UPDATE_PRICES.sql` | Script para atualizar preços |
| `.env.example` | Variáveis de ambiente |

---

## 💡 Dicas

- 📱 Teste o checkout em http://localhost:3000/#planos
- 🎛️ Gerencie tudo em http://localhost:3000/admin
- 🔐 Nunca commite `.env` com credenciais reais
- 📊 Acompanhe pagamentos no painel admin

---

## ❓ Problemas?

1. **"Mercado Pago não configurado"** → Verificar `.env`
2. **"Acesso negado ao admin"** → Executar `SETUP_ADMIN.sql`
3. **"Erro no banco"** → Executar `pnpm db:push`

Veja `GUIA_IMPLEMENTACAO.md` para mais detalhes.

---

## 📞 Próximos Passos

1. Obter credenciais Mercado Pago
2. Configurar `.env`
3. Executar SETUP_ADMIN.sql
4. Testar checkout
5. Deploy em produção

---

**Tudo pronto para começar! 🎉**
