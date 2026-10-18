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
- /perfil (consulta e edição dos próprios dados pessoais)

O Kanban usa os endpoints de ordens de serviço disponíveis na API, incluindo checklist e atualização de status. No formulário de OS, cliente e técnico são selecionados a partir da lista de contas cadastradas; o catálogo de equipamentos ainda não está disponível.

A tela de usuários respeita os perfis `admin` e `user`: administradores podem cadastrar contas, editar nome/e-mail/tipo e excluir outros usuários; usuários comuns podem consultar e editar apenas o próprio nome e e-mail. O backend aplica as mesmas regras e atualiza as permissões ativas após uma mudança de perfil.

Os tokens retornados pelo backend ficam em sessionStorage, limitados à sessão da aba. Para uma sessão persistente com proteção contra acesso por JavaScript, a API deverá futuramente emitir cookies HttpOnly, Secure e SameSite.
