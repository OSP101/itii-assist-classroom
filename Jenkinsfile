pipeline {
    agent {
        docker {
            image 'docker/compose:latest'
            args '-v /var/run/docker.sock:/var/run/docker.sock --network itii-network'
        }
    }
    
    environment {
        // Environment variables
        COMPOSE_FILE = 'docker-compose.app.yml'
        DOCKER_NETWORK = 'itii-network'
        COMPOSE_PROJECT_NAME = 'itii-app'
        
        // Git information
        GIT_COMMIT_SHORT = sh(script: "printf \$(git rev-parse --short HEAD)", returnStdout: true)
        GIT_BRANCH = sh(script: "printf \$(git rev-parse --abbrev-ref HEAD)", returnStdout: true)
        BUILD_TIMESTAMP = sh(script: "date +%Y%m%d-%H%M%S", returnStdout: true)
    }
    
    // กำหนด triggers สำหรับ GitHub webhook
    triggers {
        githubPush()  // ทริกเกอร์เมื่อมีการ push ไป GitHub
    }
    
    options {
        // เก็บ build logs ไว้ 10 ครั้งล่าสุด
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Timeout สำหรับทั้ง pipeline
        timeout(time: 30, unit: 'MINUTES')
        // ไม่อนุญาตให้รัน build พร้อมกัน
        disableConcurrentBuilds()
    }
    
    stages {
        stage('📋 Setup & Verify') {
            steps {
                script {
                    echo """
                    ╔════════════════════════════════════════╗
                    ║          BUILD INFORMATION             ║
                    ╚════════════════════════════════════════╝
                    Build Number:    ${env.BUILD_NUMBER}
                    Git Commit:      ${env.GIT_COMMIT_SHORT}
                    Git Branch:      ${env.GIT_BRANCH}
                    Build Time:      ${env.BUILD_TIMESTAMP}
                    Triggered By:    ${currentBuild.getBuildCauses()[0].shortDescription}
                    """
                    
                    // ติดตั้ง tools ที่จำเป็น
                    sh '''
                        apk add --no-cache git bash curl jq
                        echo "✓ Tools installed"
                    '''
                }
            }
        }
        
        stage('🔍 Checkout Code') {
            steps {
                script {
                    echo "Checking out code from GitHub..."
                    
                    // Checkout code จาก SCM (GitHub)
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/deploy']],  // เปลี่ยนเป็น branch ที่ต้องการ
                        userRemoteConfigs: [[
                            url: "${env.GIT_URL}",
                            credentialsId: 'github-credentials'  // ต้องสร้างใน Jenkins credentials
                        ]]
                    ])
                    
                    // แสดงข้อมูล commit ล่าสุด
                    sh '''
                        echo "Latest commit:"
                        git log -1 --pretty=format:"%h - %an, %ar : %s"
                        echo ""
                        
                        echo "Changed files in this commit:"
                        git diff-tree --no-commit-id --name-status -r HEAD || echo "No changes detected"
                    '''
                    
                    echo "✓ Code checked out successfully"
                }
            }
        }
        
        stage('🔐 Load Environment') {
            steps {
                script {
                    echo "Loading environment variables..."
                    
                    // โหลด .env จาก Jenkins credentials หรือสร้างจากตัวอย่าง
                    withCredentials([file(credentialsId: 'app-env-file', variable: 'ENV_FILE')]) {
                        sh '''
                            if [ -f "$ENV_FILE" ]; then
                                cp "$ENV_FILE" .env
                                echo "✓ Environment file loaded from credentials"
                            else
                                echo "⚠ No environment file in credentials"
                            fi
                        '''
                    }
                    
                    // ถ้าไม่มี .env ให้สร้างจาก .env.example
                    sh '''
                        if [ ! -f .env ]; then
                            if [ -f .env.example ]; then
                                cp .env.example .env
                                echo "✓ Created .env from .env.example"
                            else
                                echo "⚠ Warning: No .env file available"
                            fi
                        fi
                        
                        # แสดงค่า env (ซ่อน sensitive data)
                        if [ -f .env ]; then
                            echo "Environment variables (sanitized):"
                            cat .env | grep -v "PASSWORD\|SECRET\|KEY" | grep -v "^#" | grep -v "^$" || true
                        fi
                    '''
                }
            }
        }
        
        stage('🔗 Check Database Connection') {
            steps {
                script {
                    echo "Verifying database connectivity..."
                    
                    // ตรวจสอบ network
                    def networkExists = sh(
                        script: "docker network ls | grep ${DOCKER_NETWORK}",
                        returnStatus: true
                    ) == 0
                    
                    if (!networkExists) {
                        error("❌ Database network '${DOCKER_NETWORK}' not found!")
                    }
                    
                    // ตรวจสอบ database container
                    def dbRunning = sh(
                        script: "docker ps --format '{{.Names}}' | grep itii-mysql",
                        returnStatus: true
                    ) == 0
                    
                    if (!dbRunning) {
                        error("❌ Database container is not running!")
                    }
                    
                    echo "✓ Database is ready"
                }
            }
        }
        
        stage('🛑 Stop Old Containers') {
            steps {
                script {
                    echo "Stopping old containers..."
                    
                    sh """
                        # หยุด containers เก่า
                        docker-compose -f ${COMPOSE_FILE} down --remove-orphans || true
                        
                        # ลบ containers ที่อาจค้างอยู่
                        docker rm -f itii-backend itii-frontend 2>/dev/null || true
                        
                        # ลบ images เก่าที่ไม่ได้ใช้
                        docker image prune -f || true
                        
                        echo "✓ Old containers removed"
                    """
                }
            }
        }
        
        stage('🏗️ Build Docker Images') {
            steps {
                script {
                    echo "Building Docker images..."
                    
                    // Build images พร้อม tag version
                    sh """
                        # Build backend
                        echo "Building backend image..."
                        docker build -t itii-backend:${GIT_COMMIT_SHORT} \
                                     -t itii-backend:latest \
                                     ./back-end
                        
                        # Build frontend
                        echo "Building frontend image..."
                        docker build -t itii-frontend:${GIT_COMMIT_SHORT} \
                                     -t itii-frontend:latest \
                                     --build-arg NEXT_PUBLIC_API_URL=\${NEXT_PUBLIC_API_URL:-http://localhost:3001/api} \
                                     ./front-end
                        
                        echo "✓ Images built successfully"
                    """
                    
                    // แสดงรายการ images
                    sh '''
                        echo "Built images:"
                        docker images | grep itii- | head -10
                    '''
                }
            }
        }
        
        stage('🚀 Deploy Application') {
            steps {
                script {
                    echo "Deploying application..."
                    
                    sh """
                        # Deploy ด้วย docker-compose
                        docker-compose -f ${COMPOSE_FILE} up -d
                        
                        echo "Waiting for containers to start..."
                        sleep 5
                        
                        # แสดงสถานะ containers
                        echo "Container status:"
                        docker-compose -f ${COMPOSE_FILE} ps
                    """
                    
                    echo "✓ Application deployed"
                }
            }
        }
        
        stage('🔍 Verify Deployment') {
            steps {
                script {
                    echo "Verifying deployment..."
                    
                    // ตรวจสอบว่า containers ทำงานอยู่
                    sh '''
                        echo "Checking container health..."
                        
                        # ตรวจสอบ backend
                        if docker ps | grep -q "itii-backend"; then
                            echo "✓ Backend container is running"
                        else
                            echo "❌ Backend container is not running"
                            exit 1
                        fi
                        
                        # ตรวจสอบ frontend
                        if docker ps | grep -q "itii-frontend"; then
                            echo "✓ Frontend container is running"
                        else
                            echo "❌ Frontend container is not running"
                            exit 1
                        fi
                    '''
                    
                    // ตรวจสอบ network connectivity
                    sh '''
                        echo "Checking network connectivity..."
                        docker network inspect ${DOCKER_NETWORK} --format='{{range .Containers}}{{.Name}} {{end}}' | grep -q itii-backend
                        docker network inspect ${DOCKER_NETWORK} --format='{{range .Containers}}{{.Name}} {{end}}' | grep -q itii-frontend
                        echo "✓ All containers are in the correct network"
                    '''
                }
            }
        }
        
        stage('🏥 Health Check') {
            steps {
                script {
                    echo "Performing health checks..."
                    
                    // รอให้ services พร้อม
                    sleep(time: 15, unit: 'SECONDS')
                    
                    // ตรวจสอบ backend health
                    def backendHealthy = false
                    for (int i = 0; i < 5; i++) {
                        def result = sh(
                            script: 'curl -f http://localhost:3001/health || curl -f http://localhost:3001/api/health',
                            returnStatus: true
                        )
                        if (result == 0) {
                            backendHealthy = true
                            break
                        }
                        echo "Backend health check attempt ${i+1}/5 failed, retrying..."
                        sleep(3)
                    }
                    
                    if (backendHealthy) {
                        echo "✓ Backend is healthy"
                    } else {
                        echo "⚠ Warning: Backend health check failed"
                        sh "docker logs itii-backend --tail 30"
                    }
                    
                    // ตรวจสอบ frontend health
                    def frontendHealthy = false
                    for (int i = 0; i < 5; i++) {
                        def result = sh(
                            script: 'curl -f http://localhost:80',
                            returnStatus: true
                        )
                        if (result == 0) {
                            frontendHealthy = true
                            break
                        }
                        echo "Frontend health check attempt ${i+1}/5 failed, retrying..."
                        sleep(3)
                    }
                    
                    if (frontendHealthy) {
                        echo "✓ Frontend is healthy"
                    } else {
                        echo "⚠ Warning: Frontend health check failed"
                        sh "docker logs itii-frontend --tail 30"
                    }
                }
            }
        }
        
        stage('📊 Deployment Summary') {
            steps {
                script {
                    sh """
                        echo ""
                        echo "╔════════════════════════════════════════╗"
                        echo "║     DEPLOYMENT SUMMARY                 ║"
                        echo "╚════════════════════════════════════════╝"
                        echo ""
                        echo "📦 Running Containers:"
                        docker ps --filter "name=itii-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
                        echo ""
                        echo "🌐 Service URLs:"
                        echo "   Frontend:    http://localhost:80"
                        echo "   Backend API: http://localhost:3001/api"
                        echo "   phpMyAdmin:  http://localhost:8080"
                        echo ""
                        echo "📝 Build Information:"
                        echo "   Build:       #${BUILD_NUMBER}"
                        echo "   Commit:      ${GIT_COMMIT_SHORT}"
                        echo "   Branch:      ${GIT_BRANCH}"
                        echo "   Time:        ${BUILD_TIMESTAMP}"
                        echo ""
                    """
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo """
                ╔════════════════════════════════════════╗
                ║   ✅ DEPLOYMENT SUCCESSFUL!            ║
                ╚════════════════════════════════════════╝
                
                🎉 Application deployed successfully!
                
                📌 Access Points:
                • Frontend:   http://localhost:80
                • Backend:    http://localhost:3001/api
                • phpMyAdmin: http://localhost:8080
                
                📊 Build Info:
                • Build:  #${env.BUILD_NUMBER}
                • Commit: ${env.GIT_COMMIT_SHORT}
                • Branch: ${env.GIT_BRANCH}
                """
                
                // ส่ง notification (ถ้าต้องการ)
                // slackSend(color: 'good', message: "Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
            }
        }
        
        failure {
            script {
                echo """
                ╔════════════════════════════════════════╗
                ║   ❌ DEPLOYMENT FAILED                 ║
                ╚════════════════════════════════════════╝
                """
                
                sh """
                    echo ""
                    echo "📋 Backend Logs:"
                    echo "════════════════"
                    docker logs itii-backend --tail 100 2>&1 || echo "Cannot fetch backend logs"
                    
                    echo ""
                    echo "📋 Frontend Logs:"
                    echo "════════════════"
                    docker logs itii-frontend --tail 100 2>&1 || echo "Cannot fetch frontend logs"
                    
                    echo ""
                    echo "🔍 Container Status:"
                    echo "═══════════════════"
                    docker ps -a | grep itii- || echo "No containers found"
                """
                
                // ส่ง notification (ถ้าต้องการ)
                // slackSend(color: 'danger', message: "Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
            }
        }
        
        always {
            script {
                echo "🧹 Cleaning up..."
                sh """
                    # ลบ dangling images
                    docker image prune -f || true
                    
                    # ลบ unused volumes (ระวัง: อย่าลบ volume ของ database!)
                    # docker volume prune -f || true
                """
                echo "✓ Cleanup complete"
            }
        }
    }
}