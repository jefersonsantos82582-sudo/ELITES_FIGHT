# ELITES_FIGHT — Atualização (branch build-output)

## Feito (commitado e pushado)
1. Fix hierarquia de planos: removido slice por maxTemplates que travava templates
   de FREE/PRO/ELITE mesmo com plano correto (server/routers.ts, client Generator.tsx).
2. Selos verificados PRO (azul) / ELITE (dourado) — PlanVerifiedBadge.tsx, usado em
   ProfileCard, DashboardLayoutContent (sidebar), Admin.tsx (lista usuários).
3. Botão "Enviar ideia" (PRO/ELITE) em Settings.tsx — abre Gmail compose para
   jefersonsantos82582@gmail.com com template preenchido.

## Em andamento / próximos (por impacto)
4. Categorias fixas no gerador com IA (hoje só bebidas/produtos/clientes,
   hardcoded enum) — deveria carregar qualquer categoria do banco.
5. Sistema de usos de IA — checar se já desconta corretamente (parece já existir
   aiUsesLeft), confirmar se bloqueia quando acaba.
6. Cores por plano (theme_colors dinâmico) — atualmente presets fixos no front.

## Regras de trabalho
- Sempre checar erros de baseline com `npx tsc --noEmit` antes/depois (baseline
  tem 4 erros preexistentes não relacionados, ok ignorar esses).
- Sempre commitar + push pra branch `build-output` (não main) depois de CADA item.
- Token GitHub válido salvo via git remote (não commitar .git-credentials.env).
- Rodar testes relevantes quando existirem (server/*.test.ts) antes do commit.

## Item 4 — CONCLUÍDO (commit fa273ce, push ok)
- Categorias dinâmicas no gerador com IA (categoryId em vez do enum de 3 tipos).
- Prompt genérico p/ categorias sem prompt especializado + contexto de cores/plano.
- generator.test.ts: mock de getPlanByCode agora por código com displayOrder. Testes 9/9 verdes.
- tsc: só os 4 erros de baseline.

## Item 5 — CONCLUÍDO (selo em todo lugar + zerar erros de baseline)
- PlanVerifiedBadge: aceita plan opcional/nulo, normaliza código, planos pagos customizados
  ganham selo azul, elite/premium/vip/diamante ganham selo dourado.
- Selo adicionado em: Settings (perfil), AdminDashboard (lista de usuários),
  Admin (vencedor do sorteio, lista de vencedores, dialog de detalhes do usuário).
- Baseline de erros ZERADO: InsertPlan exportado em drizzle/schema.ts (corrige db.ts:19 e db.ts:355),
  guard de currentUser em payment.ts, planBadgeClass com fallback em Settings.tsx (TS7053).
- tsc --noEmit: 0 erros. vitest: 10/10 verdes.
