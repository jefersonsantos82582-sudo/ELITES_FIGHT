# Task: Admin CRUD para Categorias, Modelos e Cores

Repo: ELITES_FIGHT (Express+tRPC+Drizzle+React, deploy Render). Editar direto e dar push.

## Achados
- categories table: CRUD no db.ts completo (create/update/delete) mas admin.ts router só expõe create/delete -> falta updateCategory no router.
- templates table: db+router completos (create/update/delete c/ headerColor/accentColor) mas UI Admin.tsx só lista+toggle+delete, sem form de criar/editar.
- "Cores" = siteSettings key "themes" (array {name,header,accent,plan}) consumido em Generator.tsx com fallback hardcoded. Admin não tem UI dedicada, só getSettings/updateSetting genéricos.

## Plano
1. server/routers/admin.ts: add `updateCategory` mutation.
2. client/src/pages/Admin.tsx:
   - Nova TabsTrigger "Categorias" + TabsContent: lista + dialog criar/editar + delete.
   - Aba "Modelos": add botão "Novo Modelo" + editar por linha, dialog com form completo (nome, slug, categoria, plano, descrição, columns builder simples, headerColor/accentColor pickers, destaque).
   - Nova TabsTrigger "Cores" + TabsContent: edita array `themes` do siteSettings (nome, header, accent, plan) add/remove/save.
3. Testar build (tsc / vite build) e rodar dev se possível.
4. Commit + push com o token fornecido.

## Status: em andamento
