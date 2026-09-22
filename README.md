# MICROAPP

Sistema de gestão escolar com disparos de WhatsApp (faltas, lembretes e notas), cadastro de alunos/matérias, lançamento de provas e controle de acesso por papéis.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Backend | FastAPI + SQLAlchemy |
| Frontend | React 19 + Vite + Tailwind CSS |
| Banco | PostgreSQL 15 |
| WhatsApp | Evolution API |
| Orquestração | Docker Compose |
| Auth | JWT com papéis ADM, DIRETOR, PROFESSOR, ASSISTENTE, ANALISTA |

## Estrutura

```
MICROAPP/
├── backend/          # API FastAPI (app/, tests/, seed.py)
├── frontend/         # SPA React + Vite
├── docker/           # scripts de init do Postgres
├── docker-compose.yml
├── .env.example      # template portátil (versionado)
└── .env              # variáveis locais (não versionado)
```

## Pré-requisitos

- Docker e Docker Compose
- Arquivo `.env` na raiz (nunca versionado; copie a partir de `.env.example`)

## Setup (igual em qualquer PC)

1. Clone o repositório e entre na pasta do projeto.

2. Crie o `.env` a partir do template (uma vez por máquina):

```bash
# Windows (PowerShell / cmd)
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Edite só senhas, `SECRET_KEY` e `EVOLUTION_API_KEY`. **Não coloque IP da LAN em `CORS_*`** — mantenha `CORS_ALLOW_LAN=true`. O frontend monta a URL da API pelo host da página; o `docker-compose.yml` não precisa ser alterado por máquina.

Variáveis obrigatórias para o Compose:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SECRET_KEY` (JWT)
- `EVOLUTION_API_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `CORS_ALLOWED_ORIGINS` (só `localhost` / `127.0.0.1`; não use `*`)
- `CORS_ALLOW_LAN=true` (acesso pelo IP da rede local)
- `VITE_API_URL=http://localhost:8000/api/v1`

Para rodar o backend fora do Docker, use também `backend/.env.example` → `backend/.env`.

3. Suba a stack:

```bash
docker compose up -d --build
```

Serviços:

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:8000 (`/docs` para Swagger) |
| Evolution API | http://localhost:8080 |
| Postgres | apenas em `127.0.0.1:5432` (não exposto na LAN) |

Acesso na rede local: abra `http://<IP-do-PC>:5173`. A API e o CORS acompanham automaticamente.

4. Seed do admin (se ainda não existir):

Na subida, o backend já tenta criar o ADM se `ADMIN_PASSWORD` estiver definido. Para forçar via script:

```bash
docker compose exec backend python seed.py
```

## Papéis (resumo)

- **ADM / DIRETOR** — gestão de usuários e matérias; acesso amplo
- **PROFESSOR** — grade, notas e disparos operacionais de WhatsApp
- **ASSISTENTE** — cadastro de alunos e disparos de WhatsApp
- **ANALISTA** — leitura (ex.: listagem de alunos); sem disparos em massa

## Desenvolvimento

```bash
# logs
docker compose logs -f backend

# testes do backend
docker compose run --no-deps --rm backend python -m pytest -q
```

## CI/CD local (Jenkins + kind)

Para build, testes e deploy em Kubernetes local, veja [docs/ci-cd-local.md](docs/ci-cd-local.md). O Compose permanece o fluxo de desenvolvimento diário.

## Licença

Consulte o arquivo `LICENSE` no repositório, se presente.
