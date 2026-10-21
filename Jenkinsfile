pipeline {
  agent any

  environment {
    SONAR_TOKEN = credentials('sonar-token')
    IMAGE = "digital-library-app:${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build Docker Image') {
      steps { sh 'docker build -t $IMAGE .' }
    }

    stage('Trivy Filesystem Scan') {
      steps {
        sh 'docker run --rm --volumes-from jenkins -w "$WORKSPACE" aquasec/trivy:latest fs --scanners vuln,misconfig --skip-dirs node_modules --exit-code 0 .'
      }
    }

    stage('Trivy Image Scan') {
      steps {
        sh 'docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity HIGH,CRITICAL --exit-code 0 $IMAGE'
      }
    }

    stage('SonarQube Analysis') {
      steps {
        sh '''docker run --rm --volumes-from jenkins -w "$WORKSPACE" \
          -e SONAR_HOST_URL=http://host.docker.internal:9000 \
          -e SONAR_TOKEN=$SONAR_TOKEN \
          sonarsource/sonar-scanner-cli \
          -Dsonar.projectKey=digital-library-system \
          -Dsonar.sources=server,client \
          -Dsonar.exclusions=node_modules/**'''
      }
    }
  }
}