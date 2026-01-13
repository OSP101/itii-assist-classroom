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
        DOCKER_NETWORK = "itii-network"
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
                    if (env.BRANCH_NAME) {
                        env.BRANCH = env.BRANCH_NAME
                    }
                    else if (env.GIT_BRANCH) {
                        env.BRANCH = env. GIT_BRANCH. replaceFirst(/^origin\//, '')
                    }
                    else if (env. CHANGE_BRANCH) {
                        env.BRANCH = env. CHANGE_BRANCH
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
                string(credentialsId: 'DEV_GOOGLE_CLIENT_SECRET', variable: 'GOOGLE_CLIENT_SECRET'),
                string(credentialsId: 'DEV_NEXT_PUBLIC_API_URL', variable: 'NEXT_PUBLIC_API_URL')
            ]) {
                sh '''
                # Create backend .env file
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

                # Create frontend .env.local file
                mkdir -p front-end
                cat <<EOF > front-end/.env.local
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
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
                
                echo "⏳ Waiting for containers to start..."
                sleep 5
                
                if !  docker ps | grep -q itii-dev-backend; then
                    echo "❌ Backend failed to start.  Showing logs:"
                    docker logs itii-dev-backend || true
                    exit 1
                fi
                """
            }
        }

        stage('🏥 Health Check') {
            steps {
                sh """
                echo "🔍 Checking containers..."
                docker ps | grep ${PROJECT_NAME} || true
                
                echo ""
                echo "📊 Backend logs:"
                docker logs itii-dev-backend --tail 20 || true
                """
            }
        }
    }

    post {
        success {
            echo "✅ DEPLOY SUCCESS (${ENV_NAME})"
        }
        failure {
            echo "❌ DEPLOY FAILED"
            sh '''
            echo "📋 Backend logs:"
            docker logs itii-dev-backend --tail 100 || true
            echo ""
            echo "📋 Container status:"
            docker ps -a | grep itii || true
            '''
        }
        always {
            sh 'docker image prune -f || true'
        }
    }
}