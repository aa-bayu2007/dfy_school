# API Contract - Attendance Master

Base URL: `http://localhost:8081/api`

## Authentication

### Login
- **Endpoint**: `POST /auth/login`
- **Request Body**:
    ```json
    { "email": "user@email.com", "password": "password" }
    ```
- **Response**:
    ```json
    { "status": "success", "data": { "token": "...", "refresh_token": "...", "user": { ... } } }
    ```

### Register
- **Endpoint**: `POST /auth/register`

### Refresh Token
- **Endpoint**: `POST /auth/refresh`
- **Request Body**:
    ```json
    { "refresh_token": "..." }
    ```
- **Response**:
    ```json
    { "status": "success", "data": { "token": "...", "refresh_token": "..." } }
    ```

### Get Current User
- **Endpoint**: `GET /auth/me`
- **Header**: `Authorization: Bearer <token>`

---

## Attendance

### Scan QR Code
- **Endpoint**: `POST /attendance/scan`
- **Header**: `Authorization: Bearer <token>`
- **Request Body**:
    ```json
    { "student_id": 1, "qr_data": "..." }
    ```

### Attendance History
- **Endpoint**: `GET /attendance/history`
- **Query Params**: `student_id`, `class_id`, `date`

---

## Requests (Izin/Sakit)

### Submit Request
- **Endpoint**: `POST /attendance/request`
- **Request Body**: (JSON)
    ```json
    { "student_id": 1, "date": "2024-02-12", "request_type": "izin", "reason": "...", "attachment_url": "/uploads/..." }
    ```

### Upload Attachment
- **Endpoint**: `POST /upload`
- **Type**: `multipart/form-data`
- **Field**: `file`
- **Response**:
    ```json
    { "status": "success", "data": { "url": "/uploads/17000000.png" } }
    ```

---

## Notifications

### Get All Notifications
- **Endpoint**: `GET /notifications`

### Mark as Read
- **Endpoint**: `PUT /notifications/:id/read`
