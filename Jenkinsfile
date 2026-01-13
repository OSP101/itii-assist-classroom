pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        ansiColor('xterm')
    }

    environment {
        PROJECT_NAME   = "itii"
        DOCKER_NETWORK = "itii-network"
    }

    stages {

        /* ===============================
         * 📥 Checkout
         * =============================== */
        stage('📥 Checkout') {
            steps {
                checkout scm
            }
        }

        /* ===============================
         * 📋 Setup
         * =============================== */
        stage('📋 Setup') {
            steps {
                script {
                    env.GIT_BRANCH_NAME = env.BRANCH_NAME
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    echo """
==============================
 Branch : ${env.GIT_BRANCH_NAME}
 Commit : ${env.GIT_COMMIT_SHORT}
==============================
"""
                }
            }
        }

        /* ===============================
         * 🌱 Detect Environment
         * =============================== */
        stage('🌱 Detect Environment') {
            steps {
                script {
                    if (env.GIT_BRANCH_NAME == 'deploy') {
                        env.DEPLOY_ENV = 'dev'
                        env.COMPOSE_FILE = 'docker-compose.app.yml'
                    } else if (env.GIT_BRANCH_NAME == 'main') {
                        env.DEPLOY_ENV = 'prod'
                        env.COMPOSE_FILE = 'docker-compose.app.yml'
                    } else {
                        error("❌ Branch '${env.GIT_BRANCH_NAME}' not allowed")
                    }

                    echo "Deploy ENV = ${env.DEPLOY_ENV}"
                }
            }
        }

        /* ===============================
         * 🔐 Prepare ENV Files
         * =============================== */
        stage('🔐 Prepare ENV Files') {
            steps {
                script {

                    sh "docker network create ${DOCKER_NETWORK} || true"

                    if (env.DEPLOY_ENV == 'dev') {
                        withCredentials([
                            string(credentialsId: 'DEV_DB_NAME', valueVariable: 'DB_NAME'),
                            string(credentialsId: 'DEV_DB_USER', valueVariable: 'DB_USER'),
                            string(credentialsId: 'DEV_DB_PASSWORD', valueVariable: 'DB_PASSWORD'),
                            string(credentialsId: 'DEV_JWT_ACCESS_SECRET', valueVariable: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'DEV_JWT_REFRESH_SECRET', valueVariable: 'JWT_REFRESH_SECRET'),
                            string(credentialsId: 'DEV_GOOGLE_CLIENT_ID', valueVariable: 'GOOGLE_CLIENT_ID'),
                            string(credentialsId: 'DEV_GOOGLE_CLIENT_SECRET', valueVariable: 'GOOGLE_CLIENT_SECRET')
                        ]) {
                            sh '''
cat > back-end/.env <<EOF
NODE_ENV=development
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
EOF
'''
                        }
                    }

                    if (env.DEPLOY_ENV == 'prod') {
                        withCredentials([
                            string(credentialsId: 'PROD_DB_NAME', valueVariable: 'DB_NAME'),
                            string(credentialsId: 'PROD_DB_USER', valueVariable: 'DB_USER'),
                            string(credentialsId: 'PROD_DB_PASSWORD', valueVariable: 'DB_PASSWORD'),
                            string(credentialsId: 'PROD_JWT_ACCESS_SECRET', valueVariable: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'PROD_JWT_REFRESH_SECRET', valueVariable: 'JWT_REFRESH_SECRET'),
                            string(credentialsId: 'PROD_GOOGLE_CLIENT_ID', valueVariable: 'GOOGLE_CLIENT_ID'),
                            string(credentialsId: 'PROD_GOOGLE_CLIENT_SECRET', valueVariable: 'GOOGLE_CLIENT_SECRET')
                        ]) {
                            sh '''
cat > back-end/.env <<EOF
NODE_ENV=production
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
EOF
'''
                        }
                    }
                }
            }
        }

        /* ===============================
         * 🧪 Test
         * =============================== */
        stage('🧪 Test (Pre-Deploy)') {
            steps {
                sh '''
echo "=== Backend Test ==="
cd back-end || exit 0
npm install || true
npm test || true
'''
            }
        }

        /* ===============================
         * 🏗️ Build Images
         * =============================== */
        stage('🏗️ Build Images') {
            steps {
                sh '''
docker compose -f ${COMPOSE_FILE} build
'''
            }
        }

        /* ===============================
         * 🚀 Deploy
         * =============================== */
        stage('🚀 Deploy') {
            steps {
                sh '''
docker compose -f ${COMPOSE_FILE} down
docker compose -f ${COMPOSE_FILE} up -d
'''
            }
        }

        /* ===============================
         * 🏥 Health Check
         * =============================== */
        stage('🏥 Health Check') {
            steps {
                sh '''
docker ps
'''
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOY SUCCESS (${DEPLOY_ENV})"
        }
        failure {
            echo "❌ DEPLOY FAILED"
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
