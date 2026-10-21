# Run this from your project root (the folder containing package.json):
#   powershell -ExecutionPolicy Bypass -File .\setup-devsecops.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Write-Lf($path, $content) {
    $dir = Split-Path $path -Parent
    if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $full = Join-Path (Get-Location) $path
    [IO.File]::WriteAllText($full, ($content -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding($false)))
    Write-Host "created $path"
}

if (-not (Test-Path "package.json")) { throw "Run this script from the project root (package.json not found)." }

# ---------- 1. Repair .env ----------
if (-not (Test-Path ".env")) { throw ".env not found in project root." }
$lines = Get-Content ".env"
$map = [ordered]@{}
foreach ($l in $lines) { if ($l -match '^\s*([A-Za-z_]+)=(.*)$') { $map[$Matches[1]] = $Matches[2] } }

# DB_NAME from schema.sql
if ($map["DB_NAME"] -match '[<>]|PUT_|HERE' -or -not $map["DB_NAME"]) {
    $schema = Get-Content "database\schema.sql" -Raw
    if ($schema -match '(?i)CREATE\s+DATABASE\s+(IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?') {
        $map["DB_NAME"] = $Matches[2]
    } else {
        throw "Could not find CREATE DATABASE in database\schema.sql. Set DB_NAME in .env manually."
    }
}
# JWT secret
if ($map["JWT_SECRET"] -match '[<>]|PUT_|HERE' -or -not $map["JWT_SECRET"]) {
    $map["JWT_SECRET"] = -join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
}
# Passwords: letters/numbers only
if ($map["DB_PASSWORD"] -match '[^A-Za-z0-9]' -or -not $map["DB_PASSWORD"]) { $map["DB_PASSWORD"] = "LibraryPass2026x" }
if ($map["MYSQL_ROOT_PASSWORD"] -match '[^A-Za-z0-9]' -or -not $map["MYSQL_ROOT_PASSWORD"]) { $map["MYSQL_ROOT_PASSWORD"] = "RootPass2026xyz" }
if (-not $map["PORT"]) { $map["PORT"] = "3000" }
if (-not $map["DB_HOST"]) { $map["DB_HOST"] = "db" }
if (-not $map["DB_PORT"]) { $map["DB_PORT"] = "3306" }
if (-not $map["DB_USER"]) { $map["DB_USER"] = "library_user" }
if (-not $map["JWT_EXPIRES_IN"]) { $map["JWT_EXPIRES_IN"] = "1d" }
$out = ($map.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "`n"
Write-Lf ".env" ($out + "`n")

# ---------- 2. .gitignore ----------
Write-Lf ".gitignore" @'
node_modules/
.env
.env.*
!.env.example
npm-debug.log*
*.tar
trivy-report.json
'@

# ---------- 3. SonarQube config ----------
Write-Lf "sonar-project.properties" @'
sonar.projectKey=digital-library-system
sonar.sources=server,client
sonar.exclusions=node_modules/**
'@

# ---------- 4. Jenkins ----------
Write-Lf "jenkins\Dockerfile" @'
FROM jenkins/jenkins:lts-jdk17
USER root
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*
'@

Write-Lf "jenkins\docker-compose.jenkins.yml" @'
services:
  jenkins:
    build: .
    container_name: jenkins
    user: root
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
volumes:
  jenkins_home:
'@

Write-Lf "Jenkinsfile" @'
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
'@

Write-Host ""
Write-Host "Done. .env fixed (DB_NAME=$($map['DB_NAME']))." -ForegroundColor Green
Write-Host "Next: follow the remaining steps from the chat."
