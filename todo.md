# ELITES_FIGHT — Project TODO

## Identidade Visual
- [x] Configurar paleta dark/premium (preto + dourado) em index.css
- [x] Adicionar fontes Google (Inter / Sora) no index.html
- [x] Configurar ThemeProvider dark como padrão

## Banco de Dados
- [x] Schema: categories (categorias de modelos)
- [x] Schema: templates (modelos de planilhas)
- [x] Schema: generated_sheets (planilhas geradas pelo usuário)
- [x] Schema: plans (planos FREE/PRO/ELITE com limites)
- [x] Schema: site_settings (textos da home, FAQ, rodapé)
- [x] Schema: coupons (cupons de desconto)
- [x] Schema: announcements (anúncios)
- [x] Gerar migration SQL e aplicar no banco
- [x] Seed inicial: categorias, modelos padrão, planos

## Back-end (tRPC)
- [x] Router: templates (listar, filtrar por categoria/plano, buscar por id)
- [x] Router: categories (listar todas)
- [x] Router: generator (gerar planilha .xlsx, registrar no histórico)
- [x] Router: dashboard (estatísticas do usuário, histórico)
- [x] Router: admin (CRUD modelos, CRUD categorias, gerenciar usuários, estatísticas globais)
- [x] Router: settings (textos da home, FAQ, rodapé)
- [x] Router: plans (listar planos)

## Gerador .xlsx (Servidor)
- [x] Instalar exceljs
- [x] Criar serviço gerador com formatação profissional (cabeçalho, cores, bordas, fórmulas)
- [x] Upload do arquivo para S3 e retorno de URL de download

## Frontend — Landing Page
- [x] Navbar fixa com logo ELITES_FIGHT e menu responsivo
- [x] Hero Section com título, subtítulo e CTAs
- [x] Seção "Como Funciona" (4 passos)
- [x] Seção "Benefícios"
- [x] Seção "Modelos em Destaque"
- [x] Seção "Planos" (FREE / PRO / ELITE)
- [x] CTA final
- [x] Rodapé completo

## Frontend — Autenticação
- [x] Integrar Manus OAuth (login/logout)
- [x] Página de Configurações do usuário (perfil, plano, segurança)

## Frontend — Dashboard
- [x] Layout com sidebar (DashboardLayout)
- [x] Visão geral: nome, plano, modelos/temas liberados, usos restantes
- [x] Botão "Criar Planilha"
- [x] Histórico de planilhas geradas
- [x] Downloads

## Frontend — Gerador de Planilhas
- [x] Seleção de categoria
- [x] Seleção de modelo
- [x] Formulário de personalização (nome, cores, informações extras)
- [x] Preview e download

## Frontend — Biblioteca de Modelos
- [x] Grid de modelos com filtro por categoria e busca
- [x] Cards de modelos com badge de plano

## Frontend — Painel Admin
- [x] Layout admin com DashboardLayout
- [x] Dashboard admin com estatísticas e distribuição de planos
- [x] CRUD de modelos (criar, editar, excluir)
- [x] CRUD de categorias (criar, excluir)
- [x] Gerenciamento de usuários (trocar plano, suspender, promover admin, excluir)
- [x] Editor de planos (preços, limites)

## Testes e Entrega
- [x] Testes vitest para routers principais (6 testes passando)
- [x] Verificação de TypeScript sem erros
- [x] Checkpoint final
