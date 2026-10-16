# PredictAI frontend

Frontend de autenticação e gestão de manutenção do PredictAI, separado do serviço FastAPI em backend/.

## Requisitos

- Node.js 20.9 ou superior
- Backend FastAPI disponível em http://localhost:8000

## Executar localmente

No PowerShell, dentro da pasta do projeto:

    cd frontend
    Copy-Item .env.example .env.local
    npm install
    npm run dev

Abra http://localhost:3000. Ajuste NEXT_PUBLIC_API_BASE_URL em .env.local se a API estiver em outro endereço. O backend deve permitir a origem do frontend por CORS; por padrão, usa FRONTEND_URL=http://localhost:3000/reset-password.

## Rotas

- /login
- /forgot-password
- /reset-password?token=...
- /kanban (ordens de serviço)
- /usuarios (listagem, busca e edição de nome/e-mail)

O Kanban usa os endpoints de ordens de serviço disponíveis na API, incluindo checklist e atualização de status. No formulário de OS, cliente e técnico são vinculados pelo UUID da conta porque a API ainda não oferece catálogos para seleção de usuários ou equipamentos.

A tela de usuários consome os endpoints de listagem e atualização do backend. A busca e a paginação são feitas pela API; o formulário edita nome e e-mail. Controle de status, perfis e permissões ainda não estão disponíveis.

Os tokens retornados pelo backend ficam em sessionStorage, limitados à sessão da aba. Para uma sessão persistente com proteção contra acesso por JavaScript, a API deverá futuramente emitir cookies HttpOnly, Secure e SameSite.
