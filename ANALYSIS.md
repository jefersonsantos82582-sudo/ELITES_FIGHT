# Análise de Bugs de Loading Infinito / Travamento

## 1. useAuth.ts
- `loading = fbLoading || (isSyncing && meQuery.isLoading)` — se fbLoading fica true (Firebase não inicializa), nunca sai do loading
- `onAuthStateChanged` pode não disparar se Firebase não conecta
- Sem timeout de segurança no hook — precisa adicionar

## 2. Loading.tsx
- Timeout de 20s existe mas pode não ser suficiente se Firebase trava
- Rota de emergência OK (fbUser -> dashboard)
- Falta: timeout mais agressivo, fallback para tentar login novamente

## 3. Checkout.tsx
- useEffect depende de `user?.id` — se user é fallback (id=999999) pode loop
- Retry de 3s x 3 = pode travar por 9s antes de mostrar erro
- Falta timeout geral — se não consegue criar preferência em X segundos, mostrar erro

## 4. Dashboard.tsx
- Depende de `authLoading && fbUser` para mostrar fallback
- Se fbUser nunca chega, fica em loading infinito
- `authLoading = fbLoading || (isSyncing && meQuery.isLoading)` — mesmo problema

## 5. Generator.tsx
- `if (authLoading || isSyncing || (fbUser && !user))` — pode ficar preso
- Se fbUser chega mas meQuery falha, nunca sai desse estado

## 6. Admin.tsx
- Depende de `authLoading` para loading
- Depois verifica `isAuthorized` que depende de cookie/email
- Se authLoading nunca termina, nunca mostra tela de login admin

## 7. DashboardLayout.tsx
- `if (loading && !fbUser) return <Skeleton>` — se loading nunca termina, skeleton infinito
- `if (!user && !fbUser && !loading)` — OK, mostra login

## 8. CheckoutSuccess.tsx
- Loop de 10 tentativas x 2s = 20s de loading
- Se webhook nunca processa, fica 20s travado
- Falta: max 3 tentativas, depois liberar botão

## 9. main.tsx
- Token é obtido em CADA request via `auth.currentUser.getIdToken()`
- Se Firebase não conecta, getIdToken() pode travar
- Falta: timeout no getHeaders

## 10. Server (sdk.ts)
- `verifyFirebaseToken` — se JWK remoto não responde, jwtVerify trava
- Falta: timeout no jwtVerify
- Pool de conexão DB com max 5 — bom para performance
