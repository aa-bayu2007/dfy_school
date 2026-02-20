# DFY School - Sistem Absensi

Sistem menejemen absensi sekolah modern yang dibangun dengan React, TypeScript, dan Go.

## Fitur Utama

- **Dashboard Multi-Role**: View berbeda untuk Admin, Guru, dan Murid.
- **Absensi QR Code**: Murid dapat melakukan scan menggunakan perangkat seluler.
- **Manajemen Data**: Kelola data Siswa, Kelas, Mapel, dan Jadwal Pelajaran.
- **Reporting**: Rekap absensi otomatis dan laporan harian.

## Teknologi

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS & shadcn/ui
- **State Management**: React Query
- **Routing**: React Router DOM

### Backend
- **Language**: Go (Golang)
- **Framework**: Gin Gonic
- **Database**: MySQL with GORM
- **Auth**: JWT (JSON Web Token)

## Cara Menjalankan

Lihat [SETUP_GUIDE.md](./SETUP_GUIDE.md) untuk panduan instalasi lengkap.

### Setup Cepat
1. Clone repository
2. Install dependencies: `npm install`
3. Setup database MySQL
4. Jalankan Backend: `npm run backend`
5. Jalankan Frontend: `npm run dev`
