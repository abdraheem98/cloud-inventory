# Cloud Inventory

A full-stack cloud inventory application deployed on AWS using **React + Vite**, **Nginx**, **FastAPI**, and **Amazon RDS PostgreSQL**.

The project demonstrates a practical three-tier deployment model where:

- **Nginx** is the public web entry point.
- **React** is served as production static files.
- **FastAPI** runs internally on `127.0.0.1:8080`.
- **RDS PostgreSQL** runs privately inside the VPC.
- AWS Security Groups restrict communication between the application and database layers.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Architecture](#2-architecture)
- [3. Technology Stack](#3-technology-stack)
- [4. AWS Infrastructure](#4-aws-infrastructure)
- [5. Repository Structure](#5-repository-structure)
- [6. Application Request Flow](#6-application-request-flow)
- [7. Security Model](#7-security-model)
- [8. Prerequisites](#8-prerequisites)
- [9. AWS Network Setup](#9-aws-network-setup)
- [10. EC2 Setup](#10-ec2-setup)
- [11. Clone the Repository](#11-clone-the-repository)
- [12. Backend Setup](#12-backend-setup)
- [13. RDS PostgreSQL Setup](#13-rds-postgresql-setup)
- [14. Test EC2 to RDS Connectivity](#14-test-ec2-to-rds-connectivity)
- [15. Configure Backend Environment](#15-configure-backend-environment)
- [16. Test FastAPI](#16-test-fastapi)
- [17. Configure systemd](#17-configure-systemd)
- [18. Frontend Setup](#18-frontend-setup)
- [19. Build the Frontend](#19-build-the-frontend)
- [20. Nginx Setup](#20-nginx-setup)
- [21. End-to-End Testing](#21-end-to-end-testing)
- [22. Important Configuration Files](#22-important-configuration-files)
- [23. Operations Commands](#23-operations-commands)
- [24. Troubleshooting](#24-troubleshooting)
- [25. Common Mistakes](#25-common-mistakes)
- [26. Security Checklist](#26-security-checklist)
- [27. Production Hardening](#27-production-hardening)
- [28. Deployment Checklist](#28-deployment-checklist)
- [29. Key AWS Concepts Demonstrated](#29-key-aws-concepts-demonstrated)
- [30. Future Improvements](#30-future-improvements)

---

# 1. Project Overview

Cloud Inventory is a web application for managing inventory data.

The application consists of:

```text
React Frontend
      |
      v
    Nginx
      |
      v
FastAPI Backend
      |
      v
PostgreSQL RDS
```

The application is deployed on AWS using a secure network layout.

The database is **not publicly accessible**, and the FastAPI application is **not directly exposed to the Internet**.

Only Nginx is exposed through HTTP port `80`.

---

# 2. Architecture

## High-Level Architecture

```text
                         INTERNET
                            |
                            | HTTP :80
                            v
                 +-----------------------+
                 |         EC2            |
                 |      Public Subnet     |
                 |                        |
                 |       Nginx :80        |
                 +-----------+------------+
                             |
                 +-----------+------------+
                 |                        |
                 v                        v
          React Static Files        FastAPI :8080
                                    127.0.0.1
                                         |
                                         | TCP :5432
                                         v
                              +----------------------+
                              |   RDS PostgreSQL     |
                              |    Private Subnet    |
                              |       :5432          |
                              +----------------------+
```

## AWS Network Layout

```text
VPC: 10.10.0.0/16
|
+-- Public Subnet AZ-1
|     |
|     +-- EC2
|
+-- Public Subnet AZ-2
|
+-- Private Subnet AZ-1
|     |
|     +-- RDS
|
+-- Private Subnet AZ-2
|
+-- Internet Gateway
```

For this architecture:

- EC2 is in a public subnet.
- RDS is in private subnets.
- No NAT Gateway is required.
- FastAPI is bound to localhost.
- Nginx is the public entry point.

---

# 3. Technology Stack

## Frontend

- React
- Vite
- JavaScript
- HTML/CSS

## Backend

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- PostgreSQL driver

## Database

- Amazon RDS
- PostgreSQL

## Web Server / Reverse Proxy

- Nginx

## Operating System

- Ubuntu Server 24.04 LTS

## Cloud Platform

- AWS

## AWS Services

- Amazon VPC
- Internet Gateway
- EC2
- Security Groups
- Amazon RDS

---

# 4. AWS Infrastructure

| Component | Configuration |
|---|---|
| Region | `us-east-1` |
| VPC | `cloud-inventory-vpc` |
| VPC CIDR | `10.10.0.0/16` |
| Public Subnets | 2 |
| Private Subnets | 2 |
| NAT Gateway | None |
| EC2 OS | Ubuntu 24.04 LTS |
| EC2 Security Group | `cloud-inventory-ec2-sg` |
| RDS Identifier | `cloud-inventory-db` |
| RDS Database | `cloud_inventory` |
| RDS Username | `dbadmin` |
| RDS Public Access | No |
| RDS Security Group | `cloud-inventory-rds-sg` |
| FastAPI | `127.0.0.1:8080` |
| Nginx | `:80` |

> Do not store the actual RDS password or other secrets in this README.

---

# 5. Repository Structure

A simplified repository structure:

```text
cloud-inventory/
|
+-- backend/
|   |
|   +-- app/
|   |   |
|   |   +-- main.py
|   |
|   +-- requirements.txt
|   +-- .env.example
|   +-- .gitignore
|   +-- .env
|   +-- venv/
|
+-- frontend/
    |
    +-- src/
    |   |
    |   +-- main.jsx
    |
    +-- index.html
    +-- package.json
    +-- package-lock.json
    +-- dist/
```

### Important

The following should **not** be committed:

```text
backend/.env
backend/venv/
frontend/node_modules/
```

---

# 6. Application Request Flow

## Normal Page Request

When a user opens:

```text
http://<EC2_PUBLIC_IP>
```

the request flows:

```text
Browser
   |
   v
EC2 Public IP :80
   |
   v
Nginx
   |
   v
React dist/
```

## API Request

When React requests:

```text
/api/products
```

the flow is:

```text
Browser
   |
   v
Nginx :80
   |
   | /api/*
   v
FastAPI 127.0.0.1:8080
   |
   v
RDS PostgreSQL :5432
```

The browser never connects directly to:

```text
EC2:8080
```

or:

```text
RDS:5432
```

---

# 7. Security Model

## Public

Only the web layer is public:

```text
Internet
   |
   v
EC2 :80
   |
   v
Nginx
```

## Internal

FastAPI:

```text
127.0.0.1:8080
```

This means only the EC2 machine can directly access FastAPI.

## Private

RDS:

```text
RDS PostgreSQL :5432
```

RDS is configured as:

```text
Publicly accessible: No
```

The RDS Security Group allows:

```text
Source: cloud-inventory-ec2-sg
Port: 5432
```

It does not allow:

```text
0.0.0.0/0
```

---

# 8. Prerequisites

Before starting, you need:

- AWS account
- AWS region selected
- Git repository containing this application
- SSH/EC2 Instance Connect access
- RDS PostgreSQL credentials
- Basic Linux knowledge

Recommended local tools:

- Git
- SSH client / MobaXterm
- Web browser

---

# 9. AWS Network Setup

## 9.1 Create VPC

AWS Console:

```text
VPC
  -> Your VPCs
  -> Create VPC
  -> VPC and more
```

Use:

```text
Name: cloud-inventory-vpc
IPv4 CIDR: 10.10.0.0/16
Availability Zones: 2
Public Subnets: 2
Private Subnets: 2
NAT Gateway: None
VPC Endpoints: None
```

Keep DNS hostnames and DNS resolution enabled.

---

## 9.2 Internet Gateway

The public subnets should have a route:

```text
0.0.0.0/0
      |
      v
Internet Gateway
```

This allows the EC2 instance in the public subnet to communicate with the Internet.

---

# 10. EC2 Setup

Create an EC2 instance with:

```text
AMI:
Ubuntu Server 24.04 LTS

Architecture:
x86_64

Storage:
20 GiB gp3

Subnet:
Public subnet

Public IPv4:
Enabled

Security Group:
cloud-inventory-ec2-sg
```

## EC2 Security Group

Inbound:

```text
SSH
TCP 22
Source: My IP

HTTP
TCP 80
Source: 0.0.0.0/0
```

Do NOT add:

```text
TCP 8080 from 0.0.0.0/0
TCP 5432 from 0.0.0.0/0
```

---

# 11. Clone the Repository

Connect to EC2.

Check the operating system:

```bash
cat /etc/os-release
```

Install Git:

```bash
sudo apt update
sudo apt install -y git
```

Clone:

```bash
cd ~

git clone <YOUR_GIT_REPOSITORY_URL> cloud-inventory

cd ~/cloud-inventory
```

Check files:

```bash
find . -maxdepth 3 -type f | sort
```

---

# 12. Backend Setup

Go to backend:

```bash
cd ~/cloud-inventory/backend
```

Install Python tools:

```bash
sudo apt update

sudo apt install -y \
python3 \
python3-pip \
python3-venv \
build-essential
```

Create virtual environment:

```bash
python3 -m venv venv
```

Activate:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

# 13. RDS PostgreSQL Setup

Create an RDS PostgreSQL database.

Recommended configuration:

```text
Engine:
PostgreSQL

Identifier:
cloud-inventory-db

Database name:
cloud_inventory

Username:
dbadmin

Public access:
No

VPC:
cloud-inventory-vpc

Security Group:
cloud-inventory-rds-sg

Encryption:
Enabled
```

RDS should be placed in private subnets.

---

## RDS Security Group

Inbound:

```text
Type:
PostgreSQL

Port:
5432

Source:
cloud-inventory-ec2-sg
```

Do NOT use:

```text
0.0.0.0/0
```

---

# 14. Test EC2 to RDS Connectivity

Install tools:

```bash
sudo apt install -y dnsutils postgresql-client netcat-openbsd
```

## DNS Test

```bash
nslookup <RDS_ENDPOINT>
```

## TCP Test

```bash
nc -vz <RDS_ENDPOINT> 5432
```

Expected:

```text
succeeded
```

## PostgreSQL Test

```bash
psql \
-h <RDS_ENDPOINT> \
-U dbadmin \
-d cloud_inventory \
-p 5432
```

Enter the RDS password when prompted.

If connected:

```text
cloud_inventory=>
```

Exit:

```sql
\q
```

---

# 15. Configure Backend Environment

Go to:

```bash
cd ~/cloud-inventory/backend
```

Create:

```bash
vi .env
```

Add:

```env
DB_HOST=<RDS_ENDPOINT>
DB_PORT=5432
DB_NAME=cloud_inventory
DB_USER=dbadmin
DB_PASSWORD=<RDS_PASSWORD>
```

Protect the file:

```bash
chmod 600 .env
```

Verify Git ignores it:

```bash
git status
```

Never commit:

```text
.env
```

---

# 16. Test FastAPI

Activate the environment:

```bash
cd ~/cloud-inventory/backend
source venv/bin/activate
```

Test the database connection:

```bash
python -c "from app.main import engine; c=engine.connect(); print('DATABASE CONNECTION OK'); c.close()"
```

Start FastAPI manually:

```bash
python -m uvicorn app.main:app \
--host 127.0.0.1 \
--port 8080
```

Open another terminal.

Test health:

```bash
curl http://127.0.0.1:8080/api/health
```

Expected:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Test products:

```bash
curl http://127.0.0.1:8080/api/products
```

A new database may return:

```json
[]
```

Stop manual Uvicorn:

```text
Ctrl + C
```

---

# 17. Configure systemd

Create:

```bash
sudo nano /etc/systemd/system/cloud-inventory.service
```

Use:

```ini
[Unit]
Description=Cloud Inventory FastAPI Backend
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/cloud-inventory/backend
EnvironmentFile=/home/ubuntu/cloud-inventory/backend/.env
ExecStart=/home/ubuntu/cloud-inventory/backend/venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Reload systemd:

```bash
sudo systemctl daemon-reload
```

Enable at boot:

```bash
sudo systemctl enable cloud-inventory
```

Start:

```bash
sudo systemctl start cloud-inventory
```

Check:

```bash
sudo systemctl status cloud-inventory --no-pager
```

Expected:

```text
Active: active (running)
```

Test:

```bash
curl http://127.0.0.1:8080/api/health
```

---

# 18. Frontend Setup

Go to:

```bash
cd ~/cloud-inventory/frontend
```

Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node --version
npm --version
```

Install dependencies:

```bash
npm ci
```

---

# 19. Build the Frontend

The frontend should use relative API URLs.

Example:

```javascript
const API = import.meta.env.VITE_API_URL || '';
```

Check:

```bash
grep -R "VITE_API_URL\|localhost" src
```

The `package.json` build script should be:

```json
"scripts": {
  "dev": "vite --host 0.0.0.0",
  "build": "vite build"
}
```

Build:

```bash
npm run build
```

Expected:

```text
dist/index.html
dist/assets/
```

Check:

```bash
ls -lah dist
```

### Important

Do not use:

```json
"build": "vite"
```

because that starts the Vite development server.

Use:

```json
"build": "vite build"
```

for production.

---

# 20. Nginx Setup

Install:

```bash
sudo apt update
sudo apt install -y nginx
```

Check:

```bash
sudo systemctl status nginx --no-pager
```

Test:

```bash
curl -I http://localhost
```

---

## Nginx Configuration

Create:

```bash
sudo nano /etc/nginx/sites-available/cloud-inventory
```

Use:

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name _;

    root /home/ubuntu/cloud-inventory/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Enable:

```bash
sudo ln -s \
/etc/nginx/sites-available/cloud-inventory \
/etc/nginx/sites-enabled/cloud-inventory
```

Remove default:

```bash
sudo rm /etc/nginx/sites-enabled/default
```

Test:

```bash
sudo nginx -t
```

Expected:

```text
syntax is ok
test is successful
```

Reload:

```bash
sudo systemctl reload nginx
```

---

# 21. End-to-End Testing

## Test Nginx

```bash
curl -I http://localhost
```

Expected:

```text
HTTP/1.1 200 OK
```

## Test API Through Nginx

```bash
curl http://localhost/api/health
```

Expected:

```json
{
  "status": "ok",
  "database": "connected"
}
```

## Test Products

```bash
curl http://localhost/api/products
```

Expected for an empty database:

```json
[]
```

## Test Public Application

Open:

```text
http://<EC2_PUBLIC_IP>
```

The React UI should load.

---

# 22. Important Configuration Files

## Backend Environment

```text
~/cloud-inventory/backend/.env
```

Contains:

```env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
```

Do not commit this file.

---

## FastAPI Application

```text
~/cloud-inventory/backend/app/main.py
```

This contains:

- FastAPI application
- database configuration
- SQLAlchemy engine
- models
- API endpoints

---

## Frontend Entry Point

```text
~/cloud-inventory/frontend/src/main.jsx
```

The frontend uses:

```javascript
const API = import.meta.env.VITE_API_URL || '';
```

---

## systemd

```text
/etc/systemd/system/cloud-inventory.service
```

This controls the FastAPI service.

---

## Nginx

```text
/etc/nginx/sites-available/cloud-inventory
```

This controls:

- React static file serving
- `/api/` reverse proxy

---

# 23. Operations Commands

## Backend Status

```bash
sudo systemctl status cloud-inventory --no-pager
```

## Restart Backend

```bash
sudo systemctl restart cloud-inventory
```

## Stop Backend

```bash
sudo systemctl stop cloud-inventory
```

## Start Backend

```bash
sudo systemctl start cloud-inventory
```

## Backend Logs

```bash
sudo journalctl \
-u cloud-inventory \
-n 100 \
--no-pager
```

Follow logs:

```bash
sudo journalctl -u cloud-inventory -f
```

---

## Nginx Status

```bash
sudo systemctl status nginx --no-pager
```

## Reload Nginx

```bash
sudo systemctl reload nginx
```

## Restart Nginx

```bash
sudo systemctl restart nginx
```

## Validate Nginx

```bash
sudo nginx -t
```

## Nginx Error Logs

```bash
sudo tail -50 /var/log/nginx/error.log
```

## Nginx Access Logs

```bash
sudo tail -50 /var/log/nginx/access.log
```

---

## Check Ports

```bash
sudo ss -lntp | grep -E ':80|:8080|:5432'
```

Expected on EC2:

```text
:80       Nginx
127.0.0.1:8080    FastAPI
```

RDS PostgreSQL `5432` is on the RDS instance, not the EC2 machine.

---

# 24. Troubleshooting

## 24.1 FastAPI: Address Already in Use

Error:

```text
[Errno 98] error while attempting to bind
on address ('127.0.0.1', 8080):
address already in use
```

Check:

```bash
sudo ss -lntp | grep 8080
```

Then:

```bash
sudo systemctl status cloud-inventory --no-pager
```

If systemd is running FastAPI, do not start another Uvicorn process.

Use:

```bash
sudo systemctl restart cloud-inventory
```

---

## 24.2 Nginx Returns 500

Check:

```bash
sudo tail -50 /var/log/nginx/error.log
```

If you see:

```text
Permission denied
```

for:

```text
/home/ubuntu/cloud-inventory/frontend/dist/index.html
```

Nginx cannot traverse/read the frontend path.

A quick fix is:

```bash
sudo chmod o+x /home/ubuntu
sudo chmod o+x /home/ubuntu/cloud-inventory
sudo chmod o+x /home/ubuntu/cloud-inventory/frontend
sudo chmod -R o+rX /home/ubuntu/cloud-inventory/frontend/dist

sudo systemctl reload nginx
```

### Better production approach

Serve the production build from:

```text
/var/www/cloud-inventory
```

instead of directly under `/home/ubuntu`.

---

## 24.3 `/api/health` Fails

First test FastAPI directly:

```bash
curl http://127.0.0.1:8080/api/health
```

If this fails:

```bash
sudo systemctl status cloud-inventory --no-pager
```

Then:

```bash
sudo journalctl -u cloud-inventory -n 100 --no-pager
```

If FastAPI works directly but fails through Nginx:

```bash
curl http://localhost/api/health
```

Check:

```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

---

## 24.4 RDS Connection Fails

Test DNS:

```bash
nslookup <RDS_ENDPOINT>
```

Test TCP:

```bash
nc -vz <RDS_ENDPOINT> 5432
```

Test PostgreSQL:

```bash
psql \
-h <RDS_ENDPOINT> \
-U dbadmin \
-d cloud_inventory \
-p 5432
```

Check:

- RDS status
- RDS endpoint
- RDS Security Group
- EC2 Security Group
- Port `5432`
- Database username/password
- VPC/subnet configuration

---

## 24.5 Frontend Build Starts Development Server

If:

```bash
npm run build
```

shows:

```text
Local: http://localhost:5173/
```

check:

```bash
cat package.json
```

The build script should be:

```json
"build": "vite build"
```

Not:

```json
"build": "vite"
```

---

# 25. Common Mistakes

### Mistake 1: Exposing port 8080

Do not add:

```text
TCP 8080
0.0.0.0/0
```

FastAPI is intentionally internal.

---

### Mistake 2: Exposing RDS 5432

Do not configure:

```text
TCP 5432
0.0.0.0/0
```

Use:

```text
Source: cloud-inventory-ec2-sg
```

---

### Mistake 3: Starting another FastAPI process

If systemd is already running:

```text
cloud-inventory.service
```

do not run another Uvicorn process on `8080`.

---

### Mistake 4: Putting RDS credentials in React

Never put:

```text
DB_PASSWORD
DB_USER
RDS_ENDPOINT
```

inside frontend JavaScript.

The frontend communicates with the backend API.

---

### Mistake 5: Hard-coding localhost in production

Avoid:

```javascript
const API = 'http://localhost:8080';
```

Use:

```javascript
const API = import.meta.env.VITE_API_URL || '';
```

---

# 26. Security Checklist

- [x] RDS Publicly Accessible = No
- [x] RDS port 5432 not open to the Internet
- [x] RDS SG allows PostgreSQL from EC2 SG
- [x] FastAPI bound to `127.0.0.1`
- [x] EC2 SG does not expose 8080
- [x] EC2 exposes HTTP 80
- [x] SSH restricted to My IP
- [x] `.env` protected
- [x] `.env` excluded from Git
- [x] Database password not in frontend
- [x] Database not directly accessible from browser
- [x] FastAPI not directly accessible from browser

---

# 27. Production Hardening

The current architecture is suitable for a practical AWS deployment/demo.

For stronger production security:

### 1. Move frontend files

Instead of:

```text
/home/ubuntu/cloud-inventory/frontend/dist
```

use:

```text
/var/www/cloud-inventory
```

---

### 2. HTTPS

Use:

```text
HTTPS :443
```

with a proper domain and TLS certificate.

---

### 3. Application Load Balancer

For a larger production environment:

```text
Internet
   |
   v
Application Load Balancer
   |
   v
EC2 / Auto Scaling
   |
   v
RDS
```

---

### 4. Secrets Manager

Instead of storing database credentials in `.env`, consider:

```text
AWS Secrets Manager
```

or:

```text
AWS Systems Manager Parameter Store
```

---

### 5. Monitoring

Consider:

- CloudWatch
- CloudWatch Logs
- CloudWatch Alarms
- CPU monitoring
- Application health monitoring

---

### 6. Backups

Configure:

- RDS automated backups
- Backup retention
- Snapshot strategy

---

# 28. Deployment Checklist

```text
[ ] AWS region selected

[ ] VPC created
[ ] Public subnets created
[ ] Private subnets created
[ ] Internet Gateway configured
[ ] Route tables verified

[ ] EC2 Security Group created
[ ] RDS Security Group created

[ ] EC2 launched
[ ] Public IP available

[ ] RDS PostgreSQL created
[ ] RDS configured as private

[ ] EC2 -> RDS connectivity tested

[ ] Repository cloned
[ ] Backend virtual environment created
[ ] Backend dependencies installed
[ ] backend/.env configured

[ ] FastAPI database connection verified
[ ] FastAPI health endpoint verified

[ ] systemd service created
[ ] systemd service enabled
[ ] systemd service running

[ ] Frontend dependencies installed
[ ] API configuration verified
[ ] Production build completed

[ ] Nginx installed
[ ] Nginx configuration created
[ ] nginx -t successful
[ ] Nginx reloaded

[ ] /api/health works through Nginx
[ ] /api/products works through Nginx
[ ] Public UI loads

[ ] Product creation tested
[ ] Data persistence tested
```

---

# 29. Key AWS Concepts Demonstrated

## Public vs Private Subnet

A public subnet has a route to an Internet Gateway.

A private subnet does not provide direct Internet access.

---

## Security Groups

Security Groups control network access.

Example:

```text
EC2 SG
   |
   | TCP 5432
   v
RDS SG
```

This is safer than:

```text
Internet
   |
   | TCP 5432
   v
RDS
```

---

## Reverse Proxy

Nginx acts as the public gateway.

```text
Browser
   |
   v
Nginx
   |
   v
FastAPI
```

The browser does not need to know the internal FastAPI port.

---

## Localhost Binding

FastAPI:

```text
127.0.0.1:8080
```

means:

```text
Only EC2 itself can directly access it.
```

---

## Private Database

RDS:

```text
Publicly accessible: No
```

The application still works because EC2 and RDS communicate inside the VPC.

---

## systemd

systemd provides:

- Automatic startup
- Background execution
- Automatic restart
- Service status
- Centralized logs

---

# 30. Future Improvements

Potential next versions:

- Authentication and user management
- Product CRUD enhancements
- Inventory quantities
- Categories
- Search and filtering
- Dashboard analytics
- Pagination
- PostgreSQL migrations
- Docker deployment
- CI/CD using GitHub Actions
- HTTPS
- Route 53 domain
- Application Load Balancer
- Auto Scaling
- CloudWatch monitoring
- AWS Secrets Manager
- Terraform infrastructure
- Multi-environment deployment
- Blue/green deployment

---

# Final Architecture

```text
                         AWS VPC
              10.10.0.0/16
                         |
          +--------------+--------------+
          |                             |
     PUBLIC SUBNETS              PRIVATE SUBNETS
          |                             |
          v                             v
   +-------------+               +-------------+
   |    EC2      |               |    RDS      |
   |   Ubuntu    |               | PostgreSQL  |
   |             |               |             |
   | Nginx :80   |               |    :5432    |
   |     |       |               +-------------+
   |     v       |                      ^
   | FastAPI     |                      |
   |127.0.0.1:8080 ---------------------+
   +-------------+
          ^
          |
       INTERNET
          |
       Browser
```

## Application Request

```text
Browser
   |
   | HTTP :80
   v
Nginx
   |
   +---- / ----------> React
   |
   +---- /api/* -----> FastAPI
                          |
                          | PostgreSQL :5432
                          v
                       RDS
```

## Security Boundary

```text
PUBLIC
  |
  +-- Nginx :80
  |
PRIVATE
  |
  +-- FastAPI :8080
  |
  +-- RDS :5432
```

This architecture keeps the database and application process away from direct Internet access while still allowing the browser to use the application normally.
