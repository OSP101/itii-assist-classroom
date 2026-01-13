pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    triggers {
        githubPush()
    }

    environment {
        PROJECT_NAME   = "itii"
        DOCKER_NETWORK = "itii-prod"
    }

    stages {

        stage('📥 Checkout') {
            steps {
                checkout scm
            }
        }

        stage('📌 Resolve Branch') {
            steps {
                script {
                    // รองรับทั้ง Multibranch และ Pipeline ปกติ
                    env.BRANCH = env.BRANCH_NAME ?: sh(
                        script: "git rev-parse --abbrev-ref HEAD",
                        returnStdout: true
                    ).trim()

                    if (!env.BRANCH || env.BRANCH == 'HEAD') {
                        error("❌ Cannot detect branch")
                    }

                    echo "➡ Branch = ${env.BRANCH}"
                }
            }
        }

        stage('🌱 Detect Environment') {
            steps {
                script {
                    if (env.BRANCH == 'deploy') {
                        env.ENV_NAME = 'dev'
                        env.COMPOSE_FILE = 'docker-compose.dev.yml'
                    }
                    else if (env.BRANCH == 'main') {
                        env.ENV_NAME = 'prod'
                        env.COMPOSE_FILE = 'docker-compose.prod.yml'
                    }
                    else {
                        error("❌ Branch '${env.BRANCH}' not allowed")
                    }

                    echo "🚀 Deploy ENV = ${env.ENV_NAME}"
                }
            }
        }

        stage('🔐 Inject Secrets (.env)') {
            steps {
                script {
                    if (env.ENV_NAME == 'dev') {
                        withCredentials([
                            string(credentialsId: 'DEV_DB_NAME', value: 'DB_NAME'),
                            string(credentialsId: 'DEV_DB_USER', value: 'DB_USER'),
                            string(credentialsId: 'DEV_DB_PASSWORD', value: 'DB_PASSWORD'),
                            string(credentialsId: 'DEV_JWT_ACCESS_SECRET', value: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'DEV_JWT_REFRESH_SECRET', value: 'JWT_REFRESH_SECRET'),
                            string(credentialsId: 'DEV_GOOGLE_CLIENT_ID', value: 'GOOGLE_CLIENT_ID'),
                            string(credentialsId: 'DEV_GOOGLE_CLIENT_SECRET', value: 'GOOGLE_CLIENT_SECRET')
                        ]) {
                            sh '''
                            cat <<EOF > back-end/.env
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

                    if (env.ENV_NAME == 'prod') {
                        withCredentials([
                            string(credentialsId: 'PROD_DB_NAME', value: 'DB_NAME'),
                            string(credentialsId: 'PROD_DB_USER', value: 'DB_USER'),
                            string(credentialsId: 'PROD_DB_PASSWORD', value: 'DB_PASSWORD'),
                            string(credentialsId: 'PROD_JWT_ACCESS_SECRET', value: 'JWT_ACCESS_SECRET'),
                            string(credentialsId: 'PROD_JWT_REFRESH_SECRET', value: 'JWT_REFRESH_SECRET')
                        ]) {
                            sh '''
                            cat <<EOF > back-end/.env
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
EOF
                            '''
                        }
                    }
                }
            }
        }

        stage('🧪 Test') {
            steps {
                sh 'echo "🧪 Test stage (add later)"'
            }
        }

        stage('🏗 Build') {
            steps {
                sh "docker compose -f ${COMPOSE_FILE} build"
            }
        }

        stage('🚀 Deploy') {
            steps {
                sh """
                docker network create ${DOCKER_NETWORK} || true
                docker compose -f ${COMPOSE_FILE} down
                docker compose -f ${COMPOSE_FILE} up -d
                """
            }
        }

        stage('🏥 Health Check') {
            steps {
                sh 'docker ps | grep itii || true'
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOY SUCCESS (${ENV_NAME})"
        }
        failure {
            echo "❌ DEPLOY FAILED"
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}
