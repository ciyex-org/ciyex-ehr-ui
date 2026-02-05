pipeline {
  agent any

  environment {
    IMAGE_NAME = 'ciyex-ehr-ui'
    REGISTRY = 'registry.apps-prod.us-east.in.hinisoft.com'
    VERSION = "v1.0.${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Image') {
      steps {
        sh '''
          docker build -t ${REGISTRY}/${IMAGE_NAME}:${VERSION} -t ${REGISTRY}/${IMAGE_NAME}:latest .
        '''
      }
    }

    stage('Push to Registry') {
      steps {
        sh '''
          echo "eAYAx1jdocf#WeZuy3i@LJjiz*3FqzVU" | docker login ${REGISTRY} -u admin --password-stdin
          docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}
          docker push ${REGISTRY}/${IMAGE_NAME}:latest
        '''
      }
    }

    stage('Update Kustomization') {
      steps {
        sh '''
          sed -i "s/newTag: .*/newTag: \\"${VERSION}\\"/" k8s/overlays/stage/kustomization.yaml
          git add k8s/overlays/stage/kustomization.yaml
          git commit -m "chore: update stage to ${VERSION} [skip ci]" || true
          git push origin main || true
        '''
      }
    }
  }

  post {
    success {
      echo "✅ EHR UI built and pushed: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
    }
    failure {
      echo "❌ Build failed"
    }
  }
}
