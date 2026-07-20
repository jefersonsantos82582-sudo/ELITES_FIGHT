# Evidências externas da auditoria

## Ambiente publicado

A aplicação publicada em `https://elites-fight.onrender.com/` carregou a landing page após o período de inicialização do Render. O fluxo de entrada abre corretamente a página de autenticação Google do projeto `elites-fight.firebaseapp.com`.

Em 20 de julho de 2026, uma chamada pública em lote aos procedimentos `categories.list`, `templates.list` e `plans.list` retornou HTTP `207`. As operações de categorias e planos falharam com HTTP `500`, com consultas SQL que utilizavam sintaxe MySQL, incluindo placeholders `?`, embora o esquema do projeto seja PostgreSQL. A falha observada foi compatível com a camada `server/db.ts` usando o driver `drizzle-orm/mysql2` contra tabelas PostgreSQL.

Isso afeta diretamente a autenticação: após verificar um token Firebase, o servidor tenta buscar/criar o usuário no banco. Quando a consulta falha, o contexto não obtém usuário e as rotas protegidas do dashboard permanecem bloqueadas.

## Referência de autenticação Firebase

A documentação oficial do Firebase orienta que tokens de ID obtidos no cliente sejam enviados por HTTPS e validados no backend com Firebase Admin SDK inicializado por uma conta de serviço. Ela informa que `verifyIdToken()` valida o formato, expiração e assinatura, devolvendo o UID do usuário. Referência: https://firebase.google.com/docs/auth/admin/verify-id-tokens

A configuração de produção deve disponibilizar `FIREBASE_SERVICE_ACCOUNT` como JSON de conta de serviço, fora do repositório e sem hardcode de chaves privadas.

## Referência de publicação no Render

A documentação oficial do Render confirma que `preDeployCommand` é aceito em `render.yaml` e é executado após o build e antes da inicialização da nova versão. Também documenta `sync: false` para variáveis que devem ser preenchidas no painel do Render, sem sobrescrever ou expor seu valor no repositório. Referências: https://render.com/docs/blueprint-spec e https://render.com/docs/deploys

## Validação local do login (20/07/2026)

A versão local compilada abriu corretamente a página inicial e carregou os planos vindos do PostgreSQL de teste. Ao acionar **Entrar** em `http://127.0.0.1:3001`, o Firebase retornou `auth/unauthorized-domain`. Esse resultado é esperado para um domínio local que não está na lista **Authorized domains** do projeto Firebase e não representa falha no código de redirecionamento. A validação final do login no ambiente publicado requer que `elites-fight.onrender.com` esteja autorizado no Firebase Authentication.

A correção aplicada ao cliente mantém o usuário na tela de carregamento enquanto a sessão é resolvida, confirma a sessão no backend após o retorno do Firebase e apresenta falhas recuperáveis em vez de deixá-lo preso na tela de entrada.
