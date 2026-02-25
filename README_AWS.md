# AWS Deployment Guide for Visitor Management System

This document outlines how to deploy the VMS as a whole using Docker on AWS.

## Option 1: Quick Deployment (EC2 + Docker Compose)
Best for small deployments using SQLite.

1.  **Launch an EC2 Instance**:
    *   Image: Amazon Linux 2023 or Ubuntu 22.04.
    *   Instance Type: `t3.small` (minimum 2GB RAM recommended).
    *   Security Group: Open ports `80` (HTTP) and `443` (HTTPS) if using SSL.

2.  **Install Docker and Docker Compose**:
    ```bash
    sudo yum update -y
    sudo yum install docker -y
    sudo service docker start
    sudo usermod -a -G docker ec2-user
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```

3.  **Deploy the App**:
    *   Copy the project files to the EC2 instance (using `git clone` or `scp`).
    *   Navigate to the project root.
    *   Run: `docker-compose up -d --build`

## Option 2: Professional Deployment (ECS + Fargate + EFS)
Best for production scalability.

### 1. Build and Push to ECR (Elastic Container Registry)
Create two repositories: `vms-backend` and `vms-frontend`.
```bash
# Login
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<region>.amazonaws.com

# Build and Push Backend
docker build -t vms-backend ./backend
docker tag vms-backend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/vms-backend:latest
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/vms-backend:latest

# Build and Push Frontend
docker build -t vms-frontend ./frontend
docker tag vms-frontend:latest <aws_account_id>.dkr.ecr.<region>.amazonaws.com/vms-frontend:latest
docker push <aws_account_id>.dkr.ecr.<region>.amazonaws.com/vms-frontend:latest
```

### 2. Setup Persistence (EFS)
Since the app uses SQLite and stores face images on disk, you MUST use AWS EFS.
*   Create an EFS File System.
*   Create two Access Points: `/db` and `/faces`.

### 3. Create ECS Task Definition
Create a Task Definition with two containers:
*   **Backend Container**:
    *   In the "Storage" section, mount EFS volume for:
        *   `/app/vms.db` (Mapped to EFS /db)
        *   `/app/storage/faces` (Mapped to EFS /faces)
    *   Migration Script: The Dockerfile is already configured to run `start.sh` which executes `python migrate.py` automatically on startup.
*   **Frontend Container**:
    *   Port mapping: 80 -> 80.
    *   Environment variable `VITE_API_URL` should be `/api/v1` (as handled by Nginx proxy).

### 4. Create ECS Service
*   Launch type: FARGATE.
*   Use an Application Load Balancer (ALB) to route traffic to the Frontend container.

---

## Database Migrations
The deployment is configured to run migrations **automatically**. 

The `backend/start.sh` script:
1.  Runs `python migrate.py` (Creates tables, adds new columns, seeds initial admin).
2.  Starts the `uvicorn` server.

This ensures your database is always up-to-date across every deployment cycle on AWS.
