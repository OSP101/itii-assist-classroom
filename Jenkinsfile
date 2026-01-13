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

                    // ลำดับความสำคัญ
                    if (env.BRANCH_NAME) {
                        env.BRANCH = env.BRANCH_NAME
                    }
                    else if (env.GIT_BRANCH) {
                        env.BRANCH = env.GIT_BRANCH.replaceFirst(/^origin\//, '')
                    }
                    else if (env.CHANGE_BRANCH) {
                        env.BRANCH = env.CHANGE_BRANCH
                    }
                    else {
                        error("""
❌ Cannot detect branch

👉 Fix:
1. Use Multibranch Pipeline (recommended)
OR
2. Enable 'GitHub hook trigger for GITScm polling'
""")
                    }

                    echo "➡ Branch detected: ${env.BRANCH}"
                }
            }
        }

        stage('🌱 Detect Environment') {
            steps {
                script {
                    switch (env.BRANCH) {
                        case 'deploy':
                            env.ENV_NAME = 'dev'
                            env.COMPOSE_FILE = 'docker-compose.dev.yml'
                            break

                        case 'main':
                            env.ENV_NAME = 'prod'
                            env.COMPOSE_FILE = 'docker-compose.prod.yml'
                            break

                        default:
                            error("❌ Branch '${env.BRANCH}' not allowed")
                    }

                    echo "🚀 Deploy environment = ${env.ENV_NAME}"
                }
            }
        }

        stage('🔐 Inject Secrets (.env)') {
    when {
        expression { env.ENV_NAME == 'dev' }
    }
    steps {
        script {

            withCredentials([
                string(credentialsId: 'DEV_DB_NAME', variable: 'DB_NAME'),
                string(credentialsId: 'DEV_DB_USER', variable: 'DB_USER'),
                string(credentialsId: 'DEV_DB_PASSWORD', variable: 'DB_PASSWORD'),
                string(credentialsId: 'DEV_JWT_ACCESS_SECRET', variable: 'JWT_ACCESS_SECRET'),
                string(credentialsId: 'DEV_JWT_REFRESH_SECRET', variable: 'JWT_REFRESH_SECRET'),
                string(credentialsId: 'DEV_GOOGLE_CLIENT_ID', variable: 'GOOGLE_CLIENT_ID'),
                string(credentialsId: 'DEV_GOOGLE_CLIENT_SECRET', variable: 'GOOGLE_CLIENT_SECRET')
            ]) {

                sh '''
                mkdir -p back-end
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
                sh "docker ps | grep ${PROJECT_NAME} || true"
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
