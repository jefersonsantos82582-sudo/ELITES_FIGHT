# 🚀 ELITES FIGHT - Estratégia de Deploy CI/CD

Para contornar a limitação de 512MB de RAM do plano gratuito do Render, utilizamos o **GitHub Actions** para realizar o build e o Render apenas para servir os arquivos compilados.

## ⚙️ Configuração no Render

1. **Branch**: `build-output` (Esta branch é gerada automaticamente pelo GitHub Actions).
2. **Build Command**: `npm install --omit=dev`
3. **Start Command**: `npm start`
4. **Variáveis de Ambiente**: Certifique-se de que todas as variáveis necessárias (DB, Mercado Pago, Firebase Admin) estejam configuradas no Render.

## 🛠️ Configuração no GitHub

Você precisa adicionar os seguintes **Secrets** no seu repositório GitHub (`Settings > Secrets and variables > Actions`):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_MERCADO_PAGO_PUBLIC_KEY`

O workflow está configurado em `.github/workflows/deploy.yml` e dispara a cada push na branch `main`.
