# CI/CD local: Jenkins + Kubernetes (kind)

Este guia sobe o MICROAPP em um cluster Kubernetes local com **kind**, e usa **Jenkins** para testar, buildar imagens e fazer deploy. O **Docker Compose** continua sendo o fluxo do dia a dia para desenvolvimento.

## Visão geral

```
Push / Build manual → Jenkins → pytest → docker build → kind load → kubectl apply
```

| Ambiente | Uso |
| --- | --- |
| `docker compose up -d --build` | Desenvolvimento local |
| kind + Jenkins | Deploy “quase produção” local |

## Pré-requisitos

- Docker Desktop (Windows) com Linux containers
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/#installation)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- Jenkins com agent que tenha `docker`, `kind` e `kubectl` no PATH

### Cluster kind

```bash
kind create cluster --name microapp
kubectl cluster-info --context kind-microapp
```

### Secret (obrigatório, uma vez)

```bash
cp k8s/secret.yaml.example k8s/secret.yaml
# Edite senhas, SECRET_KEY, EVOLUTION_API_KEY, ADMIN_* e as URIs DATABASE_*
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
```

`k8s/secret.yaml` está no `.gitignore` — não faça commit.

### Ingress (opcional)

Sem Ingress, o frontend fica no NodePort **30080**.

Com Ingress NGINX no kind:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

O pipeline aplica `k8s/ingress.yaml` automaticamente se existir a IngressClass `nginx`.

## Jenkins

### Agent com Docker + kind

Exemplo mínimo (Linux/WSL2 ou agent em container com socket Docker):

- Plugin **Docker Pipeline** (opcional)
- Binários: `docker`, `kind`, `kubectl`
- Kubeconfig do kind disponível para o usuário do Jenkins (`~/.kube/config` ou `KUBECONFIG`)

No Windows, o caminho mais simples é rodar Jenkins **dentro do WSL2** ou em um container Linux com:

```bash
docker run -d --name jenkins \
  -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v $HOME/.kube:/root/.kube:ro \
  jenkins/jenkins:lts
```

Depois instale `kind` e `kubectl` na imagem/agent (ou use uma imagem custom). Ajuste a porta se `8080` já estiver em uso pela Evolution.

### Job Pipeline

1. New Item → Pipeline
2. Definition: **Pipeline script from SCM**
3. Aponta para este repositório; Script Path: `Jenkinsfile`
4. Build Now

O `Jenkinsfile`:

1. Checkout
2. Testa o backend (`pytest` na imagem)
3. Builda `microapp-backend:<sha>` e `microapp-frontend:<sha>` (`Dockerfile.prod`)
4. `kind load docker-image` no cluster `microapp`
5. `kubectl apply` dos manifests + `set image` com a tag do commit
6. `rollout status` de postgres, backend e frontend

## Deploy manual (sem Jenkins)

```bash
# Imagens
docker build -t microapp-backend:latest ./backend
docker build -f frontend/Dockerfile.prod -t microapp-frontend:latest ./frontend

kind load docker-image microapp-backend:latest --name microapp
kind load docker-image microapp-frontend:latest --name microapp

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/evolution.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
# opcional:
# kubectl apply -f k8s/ingress.yaml

kubectl -n microapp rollout status deployment/backend --timeout=180s
kubectl -n microapp rollout status deployment/frontend --timeout=180s
```

## URLs (NodePort)

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:30080 |
| Evolution API | http://localhost:30808 |
| Backend | via proxy Nginx em `/api` no frontend (não exposto direto) |

No kind no Docker Desktop, NodePorts costumam mapear para `localhost`.

## Manifests

| Arquivo | Função |
| --- | --- |
| `k8s/namespace.yaml` | Namespace `microapp` |
| `k8s/configmap.yaml` | Config não sensível |
| `k8s/secret.yaml.example` | Template de secrets |
| `k8s/postgres.yaml` | Postgres + PVC + init `evolution_db` |
| `k8s/evolution.yaml` | Evolution API |
| `k8s/backend.yaml` | FastAPI (`imagePullPolicy: Never`) |
| `k8s/frontend.yaml` | Nginx estático + proxy `/api` |
| `k8s/ingress.yaml` | Opcional |

Imagens locais usam `imagePullPolicy: Never` porque entram no cluster via `kind load`.

## Frontend produção

- [frontend/Dockerfile.prod](../frontend/Dockerfile.prod) — build Vite + Nginx
- [frontend/nginx.conf](../frontend/nginx.conf) — SPA + `proxy_pass` de `/api/` → `backend:8000`
- Build com `VITE_API_URL=/api/v1` (caminho relativo)

## Troubleshooting

```bash
kubectl -n microapp get pods
kubectl -n microapp logs deploy/backend
kubectl -n microapp describe pod -l app=backend
```

- **ImagePullBackOff:** rode de novo `kind load docker-image ... --name microapp`
- **Backend CrashLoop:** confira `DATABASE_URL` no Secret e se o Postgres está Ready
- **pytest falha no Jenkins:** o entrypoint do Dockerfile é sobrescrito com `--entrypoint python`; gere a imagem de teste de novo
- **Porta 30080 sem resposta no Windows:** confirme `kubectl -n microapp get svc frontend` e o mapeamento do kind/Docker Desktop
