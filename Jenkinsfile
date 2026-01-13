pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        githubPush()
    }

    environment {
        DEPLOY_ENV = ""
        COMPOSE_FILE = ""
        COMPOSE_PROJECT = ""
        DOCKER_NETWORK = ""
    }

    stages {

        stage('📥 Checkout') {
            steps {
                checkout scm
            }
        }

        stage('📋 Setup') {
            steps {
                script {
                    env.BRANCH = env.BRANCH_NAME ?: env.GIT_BRANCH?.replace("origin/", "")

                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    echo """
                    Branch  : ${env.BRANCH}
                    Commit  : ${env.GIT_COMMIT_SHORT}
                    """
                }
            }
        }

        stage('🌱 Detect Environment') {
            steps {
                script {
                    if (env.BRANCH == "deploy") {
                        env.DEPLOY_ENV = "dev"
                        env.COMPOSE_FILE = "docker-compose.dev.yml"
                        env.COMPOSE_PROJECT = "itii-dev"
                        env.DOCKER_NETWORK = "itii-dev"
                    }
                    else if (env.BRANCH == "main") {
                        env.DEPLOY_ENV = "prod"
                        env.COMPOSE_FILE = "docker-compose.prod.yml"
                        env.COMPOSE_PROJECT = "itii-prod"
                        env.DOCKER_NETWORK = "itii-prod"
                    }
                    else {
                        error("❌ Branch '${env.BRANCH}' not allowed")
                    }

                    echo "Deploy ENV = ${DEPLOY_ENV}"
                }
            }
        }

        stage('🔐 Prepare ENV Files') {
            steps {
                script {

                    sh "docker network create ${DOCKER_NETWORK} || true"

                    def PREFIX = DEPLOY_ENV.toUpperCase()

                    withCredentials([
                        string(credentialsId: "${PREFIX}_DB_NAME", value: 'DB_NAME'),
                        string(credentialsId: "${PREFIX}_DB_USER", value: 'DB_USER'),
                        string(credentialsId: "${PREFIX}_DB_PASSWORD", value: 'DB_PASSWORD'),
                        string(credentialsId: "${PREFIX}_JWT_ACCESS_SECRET", value: 'JWT_ACCESS_SECRET'),
                        string(credentialsId: "${PREFIX}_JWT_REFRESH_SECRET", value: 'JWT_REFRESH_SECRET'),
                        string(credentialsId: "${PREFIX}_GOOGLE_CLIENT_ID", value: 'GOOGLE_CLIENT_ID'),
                        string(credentialsId: "${PREFIX}_GOOGLE_CLIENT_SECRET", value: 'GOOGLE_CLIENT_SECRET')
                    ]) {

                        sh """
                        mkdir -p back-end front-end

                        cat > back-end/.env <<EOF
NODE_ENV=${DEPLOY_ENV}
PORT=3001

DB_HOST=itii-mysql
DB_PORT=3306
DB_NAME=\${DB_NAME}
DB_USER=\${DB_USER}
DB_PASSWORD=\${DB_PASSWORD}

JWT_ACCESS_SECRET=\${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=120m
JWT_REFRESH_EXPIRES_IN=1d

GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=\${GOOGLE_CLIENT_SECRET}

FRONTEND_URL=https://itii-${DEPLOY_ENV}.osp101.dev
EOF

                        cat > front-end/.env.local <<EOF
NEXT_PUBLIC_API_URL=https://api-itii-${DEPLOY_ENV}.osp101.dev/api
NEXT_PUBLIC_SOCKET_URL=https://api-itii-${DEPLOY_ENV}.osp101.dev
NEXT_PUBLIC_FRONTEND_URL=https://itii-${DEPLOY_ENV}.osp101.dev
NEXT_PUBLIC_GOOGLE_CLIENT_ID=\${GOOGLE_CLIENT_ID}
EOF
                        """
                    }
                }
            }
        }

        stage('🧪 Test') {
            steps {
                sh '''
                cd back-end && npm install && npm test || true
                cd ../front-end && npm install && npm run test --if-present || true
                '''
            }
        }

        stage('🏗️ Build Images') {
            steps {
                sh '''
                docker build -t itii-backend:latest back-end
                docker build -t itii-frontend:latest front-end
                '''
            }
        }

        stage('🚀 Deploy') {
            steps {
                sh """
                docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} down --remove-orphans || true
                docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} up -d
                """
            }
        }

        stage('🏥 Health Check') {
            steps {
                sh '''
                sleep 10
                curl -f http://localhost:3001/health
                '''
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOY ${DEPLOY_ENV.toUpperCase()} SUCCESS"
        }
        failure {
            echo "❌ DEPLOY FAILED"
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
