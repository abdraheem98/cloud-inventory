# Cloud Inventory

React + FastAPI + PostgreSQL starter for the Storage and Databases training lab.

## 1. Create the local database

In pgAdmin Query Tool, connected to the PostgreSQL server, run:

```sql
CREATE DATABASE cloudinventory;
```

If it already exists, do not recreate it.

## 2. Configure backend credentials

From the `backend` directory, copy `.env.example` to `.env` and set the password for your local PostgreSQL user. Keep `.env` private; it is excluded by `.gitignore`.

Example PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Use the actual password you have verified works in pgAdmin/psql. Do not add quotes around the value. The app uses SQLAlchemy `URL.create`, so password characters such as `@` are handled safely.

## 3. Install and run backend (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

If you already have a working `.venv`, activate it instead of creating another one.

Backend health: http://localhost:8000/api/health  
API docs: http://localhost:8000/docs

## 4. Run frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally http://localhost:5173).

## Notes

- The backend reads `backend/.env` independent of the current working directory.
- The app creates the starter table on startup. For production, use database migrations (for example, Alembic) rather than `create_all`.
- Never commit `.env` or AWS credentials. For cloud deployment, use an approved secret manager for database secrets and an EC2 IAM role for AWS service access.
