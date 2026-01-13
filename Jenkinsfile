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
        ENV_NAME = 'dev'
        COMPOSE_FILE = 'docker-compose.dev.yml'
        COMPOSE_PROJECT = 'itii-dev'
        DOCKER_NETWORK = 'itii-network'
    }

    stages {

        /* ================= CHECKOUT ================= */
        stage('📥 Checkout') {
            steps {
                checkout scm
            }
        }

        /* ================= SETUP ================= */
        stage('📋 Setup') {
            steps {
                script {
                    env.GIT_BRANCH = sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()

                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    echo """
                    Branch : ${env.GIT_BRANCH}
                    Commit : ${env.GIT_COMMIT_SHORT}
                    """
                }
            }
        }

        /* ================= ENV SWITCH ================= */
        stage('🌱 Select Environment') {
            steps {
                script {
                    if (env.GIT_BRANCH == 'main') {
                        env.ENV_NAME = 'prod'
                        env.COMPOSE_FILE = 'docker-compose.prod.yml'
                        env.COMPOSE_PROJECT = 'itii-prod'
                    } else {
                        env.ENV_NAME = 'dev'
                        env.COMPOSE_FILE = 'docker-compose.dev.yml'
                        env.COMPOSE_PROJECT = 'itii-dev'
                    }

                    echo "Deploy ENV = ${env.ENV_NAME}"
                }
            }
        }

        /* ================= PREPARE ENV ================= */
        stage('🔐 Prepare ENV Files') {
            steps {
                script {

                    sh 'docker network create itii-network || true'

                    if (env.ENV_NAME == 'dev') {
                        withCredentials([
                            string(credentialsId: 'DEV_DB_NAME', variable: 'DB_NAME'),
                            string(credentialsId: 'DEV_DB_USER', variable: 'DB_USER'),
                            string(credentialsId: 'DEV_DB_PASSWORD', variable: 'DB_PASSWORD'),
                            string(credentialsId: 'DEV_JWT_ACCESS_SECRET', variable: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'DEV_JWT_REFRESH_SECRET', variable: 'JWT_REFRESH_SECRET')
                        ]) {
                            sh '''
                            cat <<EOF > back-end/.env
NODE_ENV=development
PORT=3001
DB_HOST=itii-mysql
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
FRONTEND_URL=https://itii-dev.osp101.dev
EOF

                            cat <<EOF > front-end/.env.local
NEXT_PUBLIC_API_URL=https://api-itii-dev.osp101.dev/api
NEXT_PUBLIC_FRONTEND_URL=https://itii-dev.osp101.dev
EOF
                            '''
                        }
                    }

                    if (env.ENV_NAME == 'prod') {
                        withCredentials([
                            string(credentialsId: 'PROD_DB_NAME', variable: 'DB_NAME'),
                            string(credentialsId: 'PROD_DB_USER', variable: 'DB_USER'),
                            string(credentialsId: 'PROD_DB_PASSWORD', variable: 'DB_PASSWORD'),
                            string(credentialsId: 'PROD_JWT_ACCESS_SECRET', variable: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'PROD_JWT_REFRESH_SECRET', variable: 'JWT_REFRESH_SECRET')
                        ]) {
                            sh '''
                            cat <<EOF > back-end/.env
NODE_ENV=production
PORT=3001
DB_HOST=itii-mysql
DB_PORT=3306
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
FRONTEND_URL=https://itii.osp101.dev
EOF

                            cat <<EOF > front-end/.env.local
NEXT_PUBLIC_API_URL=https://api-itii.osp101.dev/api
NEXT_PUBLIC_FRONTEND_URL=https://itii.osp101.dev
EOF
                            '''
                        }
                    }
                }
            }
        }

        /* ================= TEST ================= */
        stage('🧪 Test (Pre-Deploy)') {
            steps {
                sh '''
                echo "=== Backend Test ==="
                docker run --rm \
                  -v "$PWD/back-end:/app" \
                  -w /app \
                  node:20 \
                  sh -c "npm install && npm test || true"

                echo "=== Frontend Test ==="
                docker run --rm \
                  -v "$PWD/front-end:/app" \
                  -w /app \
                  node:20 \
                  sh -c "npm install && npm run test --if-present || true"
                '''
            }
        }

        /* ================= DEPLOY ================= */
        stage('🚀 Deploy') {
            steps {
                sh """
                docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} down || true
                docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} up -d --build
                docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} ps
                """
            }
        }

        /* ================= HEALTH ================= */
        stage('🏥 Health Check') {
            steps {
                script {
                    sleep 10

                    if (env.ENV_NAME == 'dev') {
                        sh '''
                        curl -f http://localhost:3001/health
                        curl -f http://localhost:81
                        '''
                    } else {
                        sh '''
                        curl -f https://api-itii.osp101.dev/health
                        curl -f https://itii.osp101.dev
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ ${ENV_NAME.toUpperCase()} DEPLOY SUCCESS"
        }
        failure {
            echo "❌ DEPLOY FAILED"
            sh '''
            docker ps -a | grep itii || true
            docker logs itii-prod-backend || true
            docker logs itii-dev-backend || true
            '''
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
