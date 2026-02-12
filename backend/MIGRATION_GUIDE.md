# Migration Guide: Supabase to Go-Local

## Overview
This guide provides instructions for transitioning the project from a Supabase-managed backend to the local Go + MySQL architecture.

## 1. Database Setup
- Ensure MySQL is running.
- Create a database: `CREATE DATABASE school_system;`
- Configure `backend/.env` with your MySQL credentials.
- The Go backend uses GORM and will automatically handle schema synchronization (AutoMigrate).

## 2. Environment Variables
Copy `backend/.env.example` to `backend/.env` and update the values.
- `JWT_SECRET`: Used for Access Tokens.
- `JWT_REFRESH_SECRET`: Used for Refresh Tokens.

## 3. Frontend Configuration
- Update `src/config/api.ts`:
  ```typescript
  export const API_BASE_URL = 'http://localhost:8081/api';
  ```
- All Supabase client logic has been replaced with standard `fetch` calls to the Go backend.

## 4. Storage
- Attachments are now stored in `backend/uploads`.
- Ensure the directory has write permissions.

## 5. Running the System
- **Backend**: `cd backend && go run main.go`
- **Frontend**: `npm run dev`
