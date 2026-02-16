# 🚀 DFY School - Panduan Setup Instalasi

Panduan lengkap untuk setup project DFY School untuk pertama kali.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Setup Backend](#setup-backend)
3. [Setup Frontend](#setup-frontend)
4. [Menjalankan Aplikasi](#menjalankan-aplikasi)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Pastikan tools berikut sudah terinstall di komputer Anda:

### 1. Node.js (v18 atau lebih tinggi)
```bash
# Cek versi Node.js
node --version

# Cek versi npm
npm --version
```

**Download**: [https://nodejs.org/](https://nodejs.org/)

### 2. Go (Golang) v1.21 atau lebih tinggi
```bash
# Cek versi Go
go version
```

**Download**: [https://go.dev/dl/](https://go.dev/dl/)

### 3. MySQL (v8.0 atau lebih tinggi)
```bash
# Cek versi MySQL
mysql --version
```

**Download**: [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)

### 4. Git
```bash
# Cek versi Git
git --version
```

**Download**: [https://git-scm.com/downloads](https://git-scm.com/downloads)

---

## 🗄️ Setup Backend

### 1. Masuk ke Folder Backend
```bash
cd backend
```

### 2. Buat File Environment (.env)

Salin file `.env.example` menjadi `.env`:
```bash
copy .env.example .env
```

Edit file `.env` dan sesuaikan dengan konfigurasi MySQL Anda:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school_system
JWT_SECRET=your_secret_key_here_change_this
```

> [!IMPORTANT]
> - Ganti `your_mysql_password` dengan password MySQL Anda
> - Ganti `JWT_SECRET` dengan string random yang aman (minimal 32 karakter)

### 3. Buat Database MySQL

Buka MySQL client dan jalankan:
```sql
CREATE DATABASE school_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Atau via command line:
```bash
mysql -u root -p -e "CREATE DATABASE school_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 4. Install Dependencies Go

```bash
go mod download
go mod tidy
```

### 5. Jalankan Migrasi Database

Backend menggunakan GORM untuk auto-migration. Migrasi akan berjalan otomatis saat aplikasi pertama kali dijalankan.

---

## 🎨 Setup Frontend

### 1. Kembali ke Root Project
```bash
cd ..
```

### 2. Verifikasi File Environment (.env)

File `.env` sudah ada di root project dengan konfigurasi Supabase:
```env
VITE_SUPABASE_PROJECT_ID="gcvhxlkaynfwcqyasygn"
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://gcvhxlkaynfwcqyasygn.supabase.co"
```

> [!NOTE]
> File `.env` sudah dikonfigurasi dengan benar, tidak perlu diubah kecuali Anda menggunakan Supabase project yang berbeda.

### 3. Install Dependencies Node.js

Pilih salah satu package manager:

**Menggunakan npm:**
```bash
npm install
```

**Atau menggunakan bun (lebih cepat):**
```bash
bun install
```

---

## ▶️ Menjalankan Aplikasi

### Opsi 1: Menjalankan Frontend dan Backend Secara Terpisah

**Terminal 1 - Backend:**
```bash
cd backend
go run main.go
```

Backend akan berjalan di: `http://localhost:8080`

**Terminal 2 - Frontend:**
```bash
npm run dev
# atau
bun dev
```

Frontend akan berjalan di: `http://localhost:5173`

### Opsi 2: Menjalankan Backend via npm Script

**Terminal 1 - Backend:**
```bash
npm run backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

---

## ✅ Verifikasi Instalasi

### 1. Cek Backend
Buka browser dan akses:
```
http://localhost:8080/api/health
```

Atau via curl:
```bash
curl http://localhost:8080/api/health
```

### 2. Cek Frontend
Buka browser dan akses:
```
http://localhost:5173
```

### 3. Cek Database
```bash
mysql -u root -p school_system -e "SHOW TABLES;"
```

Anda harus melihat tabel-tabel yang sudah dibuat oleh GORM migration.

---

## 🔨 Build untuk Production

### Build Frontend
```bash
npm run build
```

File hasil build akan ada di folder `dist/`

### Build Backend
```bash
cd backend
go build -o school-system.exe main.go
```

File executable akan dibuat: `school-system.exe`

---

## 🐛 Troubleshooting

### Problem: "go: command not found"
**Solusi**: Install Go dari [https://go.dev/dl/](https://go.dev/dl/) dan pastikan Go sudah ada di PATH

### Problem: "Error 1045: Access denied for user"
**Solusi**: 
- Periksa username dan password MySQL di file `backend/.env`
- Pastikan MySQL service sudah berjalan
- Reset password MySQL jika perlu

### Problem: "Error 1049: Unknown database 'school_system'"
**Solusi**: Buat database terlebih dahulu:
```sql
CREATE DATABASE school_system;
```

### Problem: "Port 8080 already in use"
**Solusi**: 
- Matikan aplikasi lain yang menggunakan port 8080
- Atau ubah port di `backend/main.go`

### Problem: "Port 5173 already in use"
**Solusi**: 
- Matikan aplikasi Vite lain yang berjalan
- Atau Vite akan otomatis menggunakan port berikutnya (5174, 5175, dst)

### Problem: Dependencies tidak terinstall dengan benar
**Solusi**:
```bash
# Hapus node_modules dan install ulang
rm -rf node_modules package-lock.json
npm install

# Untuk backend
cd backend
go clean -modcache
go mod download
```

### Problem: CORS Error saat Frontend akses Backend
**Solusi**: Pastikan backend sudah mengaktifkan CORS untuk `http://localhost:5173`

---

## 📚 Struktur Project

```
dfy_school/
├── backend/              # Backend Go application
│   ├── cmd/             # Command line tools
│   ├── config/          # Configuration files
│   ├── controller/      # HTTP handlers
│   ├── middleware/      # Middleware functions
│   ├── migrations/      # Database migrations
│   ├── models/          # Database models
│   ├── repositories/    # Data access layer
│   ├── routes/          # Route definitions
│   ├── services/        # Business logic
│   ├── .env.example     # Environment template
│   ├── go.mod           # Go dependencies
│   └── main.go          # Entry point
│
├── src/                 # Frontend React application
│   ├── components/      # React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities
│   └── ...
│
├── public/             # Static assets
├── .env                # Frontend environment
├── package.json        # Node.js dependencies
├── vite.config.ts      # Vite configuration
└── README.md           # Project documentation
```

---

## 🎯 Next Steps

Setelah setup berhasil:

1. **Buat User Admin**: Gunakan endpoint `/api/auth/register` untuk membuat user pertama
2. **Explore API**: Lihat `backend/API_CONTRACT.md` untuk dokumentasi API
3. **Development**: Mulai develop fitur baru
4. **Testing**: Jalankan test dengan `npm test`

---

## 📞 Bantuan

Jika mengalami masalah:
1. Periksa log error di terminal
2. Pastikan semua prerequisites sudah terinstall
3. Verifikasi konfigurasi `.env` sudah benar
4. Cek dokumentasi di `backend/API_CONTRACT.md`

---

**Happy Coding! 🚀**
