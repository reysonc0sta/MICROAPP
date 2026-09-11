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
└── .env.example      # modelo de variáveis (copie para .env)
```

## Pré-requisitos

- Docker e Docker Compose
- Arquivo `.env` na raiz (nunca versionado)

## Setup

1. Clone o repositório e entre na pasta do projeto.

2. Crie o `.env` a partir do exemplo e preencha valores reais:

```bash
cp .env.example .env
```

Variáveis obrigatórias para o Compose (veja `.env.example`):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `SECRET_KEY` (JWT)
- `EVOLUTION_API_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `CORS_ALLOWED_ORIGINS` (origens explícitas do frontend; não use `*`)
- `VITE_API_URL` (ex.: `http://localhost:8000/api/v1`)

Há também exemplos locais em `backend/.env.example` e `frontend/.env.example` se rodar serviços fora do Docker.

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

## Licença

Consulte o arquivo `LICENSE` no repositório, se presente.
