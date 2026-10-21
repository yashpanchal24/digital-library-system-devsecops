pipeline {
  agent any

  options {
    timestamps()
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'docker run --rm --volumes-from jenkins -w "$WORKSPACE" node:20-alpine npm ci'
      }
    }

    stage('Validate') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -w "$WORKSPACE" node:20-alpine sh -c '
            for f in $(find server -name "*.js" -not -path "*/node_modules/*"); do
              node --check "$f" || exit 1
            done
            npm ls --omit=dev --depth=0
          '
        '''
      }
    }

    stage('Trivy Security Scan') {
      steps {
        sh '''
          docker run --rm --volumes-from jenkins -v trivy-cache:/root/.cache -w "$WORKSPACE" aquasec/trivy:latest \
            fs --scanners vuln,misconfig --skip-dirs node_modules --exit-code 0 \
            --format json --output trivy-fs-report.json .
          docker run --rm --volumes-from jenkins -v trivy-cache:/root/.cache -w "$WORKSPACE" aquasec/trivy:latest \
            convert --format table --output trivy-fs-report.txt trivy-fs-report.json
          cat trivy-fs-report.txt
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        sh 'docker build -t digital-library-app:$BUILD_NUMBER -t digital-library-app:latest .'
      }
    }

    stage('Pipeline Result') {
      steps {
        sh 'docker images | grep digital-library-app'
        echo 'All stages completed'
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'trivy-fs-report.*', allowEmptyArchive: true
    }
    success {
      echo 'Pipeline SUCCESS'
    }
    failure {
      echo 'Pipeline FAILED'
    }
  }
}
