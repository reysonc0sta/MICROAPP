// CI+CD local: testa, builda imagens, carrega no kind e faz deploy.
// Pré-requisitos no agent: docker, kind, kubectl; cluster kind --name microapp;
// Secret microapp-secrets já aplicado no namespace microapp (ver docs/ci-cd-local.md).

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    KIND_CLUSTER   = 'microapp'
    K8S_NS         = 'microapp'
    BACKEND_IMAGE  = 'microapp-backend'
    FRONTEND_IMAGE = 'microapp-frontend'
    IMAGE_TAG      = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test backend') {
      steps {
        sh '''
          set -e
          docker build -t ${BACKEND_IMAGE}:test ./backend
          docker run --rm --entrypoint python ${BACKEND_IMAGE}:test -m pytest -q
        '''
      }
    }

    stage('Build images') {
      steps {
        sh '''
          set -e
          docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend
          docker build -f frontend/Dockerfile.prod \
            -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
            -t ${FRONTEND_IMAGE}:latest \
            ./frontend
        '''
      }
    }

    stage('Load into kind') {
      steps {
        sh '''
          set -e
          kind get clusters | grep -qx "${KIND_CLUSTER}" || \
            kind create cluster --name "${KIND_CLUSTER}"
          kind load docker-image ${BACKEND_IMAGE}:${IMAGE_TAG} --name "${KIND_CLUSTER}"
          kind load docker-image ${BACKEND_IMAGE}:latest --name "${KIND_CLUSTER}"
          kind load docker-image ${FRONTEND_IMAGE}:${IMAGE_TAG} --name "${KIND_CLUSTER}"
          kind load docker-image ${FRONTEND_IMAGE}:latest --name "${KIND_CLUSTER}"
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          set -e
          kubectl config use-context "kind-${KIND_CLUSTER}"

          kubectl apply -f k8s/namespace.yaml
          kubectl apply -f k8s/configmap.yaml

          if [ -f k8s/secret.yaml ]; then
            kubectl apply -f k8s/secret.yaml
          elif ! kubectl -n "${K8S_NS}" get secret microapp-secrets >/dev/null 2>&1; then
            echo "ERRO: crie k8s/secret.yaml a partir de k8s/secret.yaml.example e aplique uma vez."
            exit 1
          fi

          kubectl apply -f k8s/postgres.yaml
          kubectl apply -f k8s/evolution.yaml
          kubectl apply -f k8s/backend.yaml
          kubectl apply -f k8s/frontend.yaml

          # Ingress é opcional (só se ingress-nginx estiver instalado)
          if kubectl get ingressclass nginx >/dev/null 2>&1; then
            kubectl apply -f k8s/ingress.yaml || true
          fi

          kubectl -n "${K8S_NS}" set image deployment/backend \
            backend=${BACKEND_IMAGE}:${IMAGE_TAG}
          kubectl -n "${K8S_NS}" set image deployment/frontend \
            frontend=${FRONTEND_IMAGE}:${IMAGE_TAG}
        '''
      }
    }

    stage('Smoke') {
      steps {
        sh '''
          set -e
          kubectl -n "${K8S_NS}" rollout status deployment/postgres --timeout=180s
          kubectl -n "${K8S_NS}" rollout status deployment/backend --timeout=180s
          kubectl -n "${K8S_NS}" rollout status deployment/frontend --timeout=180s
          kubectl -n "${K8S_NS}" get pods,svc
          echo "Frontend (NodePort): http://localhost:30080"
          echo "Evolution (NodePort): http://localhost:30808"
        '''
      }
    }
  }

  post {
    failure {
      sh '''
        kubectl -n microapp get pods || true
        kubectl -n microapp describe pods || true
      '''
    }
  }
}
