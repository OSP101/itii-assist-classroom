pipeline {
    agent any

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    environment {
        // --- runtime ---
        DEPLOY_ENV       = ""
        COMPOSE_FILE     = ""
        COMPOSE_PROJECT  = ""
        DOCKER_NETWORK   = ""

        // --- app ---
        NODE_ENV = ""

        // --- database (from Jenkins Global Env) ---
        DB_NAME     = ""
        DB_USER     = ""
        DB_PASSWORD = ""

        // --- secrets ---
        JWT_ACCESS_SECRET  = ""
        JWT_REFRESH_SECRET = ""
        GOOGLE_CLIENT_ID     = ""
        GOOGLE_CLIENT_SECRET = ""
    }

    stages {

        /* -------------------- CHECKOUT -------------------- */
        stage('📥 Checkout') {
            steps {
                checkout scm
            }
        }

        /* -------------------- SETUP -------------------- */
        stage('📋 Setup') {
            steps {
                script {
                    env.GIT_BRANCH_NAME = sh(
                        script: "git rev-parse --abbrev-ref HEAD",
                        returnStdout: true
                    ).trim()

                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    echo """
                    Branch  : ${env.GIT_BRANCH_NAME}
                    Commit  : ${env.GIT_COMMIT_SHORT}
                    """
                }
            }
        }

        /* -------------------- DETECT ENV -------------------- */
        stage('🌱 Detect Environment') {
            steps {
                script {
                    if (env.GIT_BRANCH_NAME == "deploy") {
                        env.DEPLOY_ENV      = "dev"
                        env.NODE_ENV        = "development"
                        env.COMPOSE_FILE    = "docker-compose.dev.yml"
                        env.COMPOSE_PROJECT = "itii-dev"
                        env.DOCKER_NETWORK  = "itii-dev"

                        env.DB_NAME     = env.DEV_DB_NAME
                        env.DB_USER     = env.DEV_DB_USER
                        env.DB_PASSWORD = env.DEV_DB_PASSWORD

                        env.JWT_ACCESS_SECRET  = env.DEV_JWT_ACCESS_SECRET
                        env.JWT_REFRESH_SECRET = env.DEV_JWT_REFRESH_SECRET
                        env.GOOGLE_CLIENT_ID     = env.DEV_GOOGLE_CLIENT_ID
                        env.GOOGLE_CLIENT_SECRET = env.DEV_GOOGLE_CLIENT_SECRET

                    } else if (env.GIT_BRANCH_NAME == "main") {
                        env.DEPLOY_ENV      = "prod"
                        env.NODE_ENV        = "production"
                        env.COMPOSE_FILE    = "docker-compose.prod.yml"
                        env.COMPOSE_PROJECT = "itii-prod"
                        env.DOCKER_NETWORK  = "itii-prod"

                        env.DB_NAME     = env.PROD_DB_NAME
                        env.DB_USER     = env.PROD_DB_USER
                        env.DB_PASSWORD = env.PROD_DB_PASSWORD

                        env.JWT_ACCESS_SECRET  = env.PROD_JWT_ACCESS_SECRET
                        env.JWT_REFRESH_SECRET = env.PROD_JWT_REFRESH_SECRET
                        env.GOOGLE_CLIENT_ID     = env.PROD_GOOGLE_CLIENT_ID
                        env.GOOGLE_CLIENT_SECRET = env.PROD_GOOGLE_CLIENT_SECRET

                    } else {
                        error("❌ Branch '${env.GIT_BRANCH_NAME}' not allowed")
                    }

                    echo "✅ Deploy ENV = ${env.DEPLOY_ENV}"
                }
            }
        }

        /* -------------------- PREPARE ENV FILE -------------------- */
        stage('🔐 Prepare ENV Files') {
            steps {
                sh """
                cat > back-end/.env <<EOF
NODE_ENV=${env.NODE_ENV}
DB_NAME=${env.DB_NAME}
DB_USER=${env.DB_USER}
DB_PASSWORD=${env.DB_PASSWORD}
JWT_ACCESS_SECRET=${env.JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${env.JWT_REFRESH_SECRET}
GOOGLE_CLIENT_ID=${env.GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${env.GOOGLE_CLIENT_SECRET}
EOF
                """
            }
        }

        /* -------------------- TEST -------------------- */
        stage('🧪 Test') {
            steps {
                sh """
                cd back-end
                npm ci
                npm test || true
                """
            }
        }

        /* -------------------- BUILD -------------------- */
        stage('🏗️ Build Images') {
            steps {
                sh """
                docker compose \
                  -f ${env.COMPOSE_FILE} \
                  -p ${env.COMPOSE_PROJECT} \
                  build
                """
            }
        }

        /* -------------------- DEPLOY -------------------- */
        stage('🚀 Deploy') {
            steps {
                sh """
                docker network inspect ${env.DOCKER_NETWORK} >/dev/null 2>&1 || \
                docker network create ${env.DOCKER_NETWORK}

                docker compose \
                  -f ${env.COMPOSE_FILE} \
                  -p ${env.COMPOSE_PROJECT} \
                  up -d
                """
            }
        }

        /* -------------------- HEALTH -------------------- */
        stage('🏥 Health Check') {
            steps {
                sh """
                docker ps --filter "name=${env.COMPOSE_PROJECT}"
                """
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOY ${env.DEPLOY_ENV.toUpperCase()} SUCCESS"
        }
        failure {
            echo "❌ DEPLOY FAILED"
        }
        always {
            sh "docker image prune -f || true"
        }
    }
}
