# 🚀 Quick Start Guide - DFY School

Panduan cepat untuk memulai project DFY School.

## ⚡ Setup Cepat (5 Menit)

### 1️⃣ Verifikasi Prerequisites

Jalankan script verifikasi:
```powershell
.\verify-setup.bat
```

> [!NOTE]
> **PowerShell Users**: Gunakan `.\` di depan nama file batch. Contoh: `.\verify-setup.bat`

Pastikan semua check ✅ PASS.

### 2️⃣ Setup Otomatis

Jalankan script setup:
```powershell
.\setup.bat
```

Script ini akan:
- ✅ Membuat file `.env` untuk backend
- ✅ Install dependencies Go
- ✅ Install dependencies Node.js

### 3️⃣ Setup Database

Buka MySQL dan buat database:
```sql
CREATE DATABASE school_system;
```

Atau via command line:
```powershell
mysql -u root -p -e "CREATE DATABASE school_system;"
```

### 4️⃣ Konfigurasi Environment

Edit file `backend\.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here    # ⚠️ GANTI INI
DB_NAME=school_system
JWT_SECRET=your_secret_key_here   # ⚠️ GANTI INI
```

### 5️⃣ Jalankan Aplikasi

**Terminal 1 - Backend:**
```powershell
.\start-backend.bat
```

**Terminal 2 - Frontend:**
```powershell
.\start-frontend.bat
```

### 6️⃣ Akses Aplikasi

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080

---

## 📝 Manual Setup

Jika script otomatis tidak bekerja, ikuti langkah manual:

### Backend Setup
```powershell
cd backend
copy .env.example .env
# Edit .env sesuai konfigurasi Anda
go mod download
go mod tidy
cd ..
```

### Frontend Setup
```powershell
npm install
```

### Jalankan Aplikasi
```powershell
# Terminal 1
cd backend
go run main.go

# Terminal 2
npm run dev
```

---

## 🎯 Cara Lengkap (Step by Step)

```powershell
# 1. Jalankan verifikasi
.\verify-setup.bat

# 2. Jalankan setup otomatis
.\setup.bat

# 3. Buat database MySQL
mysql -u root -p -e "CREATE DATABASE school_system;"

# 4. Edit backend\.env (sesuaikan password MySQL dan JWT secret)

# 5. Jalankan aplikasi
.\start-backend.bat    # Terminal 1
.\start-frontend.bat   # Terminal 2
```

---

## 🔍 Troubleshooting Cepat

| Problem | Solusi |
|---------|--------|
| `verify-setup.bat: command not found` | Gunakan `.\verify-setup.bat` di PowerShell |
| `go: command not found` | Install Go dari https://go.dev/dl/ |
| `node: command not found` | Install Node.js dari https://nodejs.org/ |
| `Access denied for user` | Periksa password MySQL di `backend\.env` |
| `Unknown database` | Buat database: `CREATE DATABASE school_system;` |
| `Port already in use` | Matikan aplikasi lain atau ubah port |

---

## 📚 Dokumentasi Lengkap

Untuk panduan detail, lihat:
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Panduan instalasi lengkap
- **[backend/API_CONTRACT.md](./backend/API_CONTRACT.md)** - Dokumentasi API

---

## 🎯 Struktur File Setup

```
dfy_school/
├── setup.bat              # Script setup otomatis
├── verify-setup.bat       # Script verifikasi instalasi
├── start-backend.bat      # Start backend server
├── start-frontend.bat     # Start frontend server
├── SETUP_GUIDE.md         # Panduan lengkap
├── QUICK_START.md         # Panduan ini
└── backend/
    └── .env               # Konfigurasi backend (buat dari .env.example)
```

---

**Selamat coding! 🎉**
