# 🌐 NetBot – Chatbot AI Pembelajaran Jaringan Komputer

Aplikasi chatbot berbasis AI yang difokuskan sebagai media pembelajaran Jaringan Komputer, dibangun dengan React (frontend) dan Node.js/Express (backend).

---

## 🗂️ Struktur Project

```
chatbot-jaringan/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js       # Koneksi PostgreSQL
│   │   │   └── migrate.js        # Buat tabel database
│   │   ├── controllers/
│   │   │   ├── authController.js # Register, Login, GetMe
│   │   │   └── chatController.js # CRUD chat + AI API
│   │   ├── middleware/
│   │   │   └── auth.js           # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.js           # Route autentikasi
│   │   │   └── chat.js           # Route chat
│   │   └── index.js              # Entry point server
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── PrivateRoute.jsx
    │   │   └── chat/
    │   │       ├── Sidebar.jsx     # History chat
    │   │       ├── ChatArea.jsx    # Area percakapan
    │   │       └── ChatInput.jsx   # Input pesan
    │   ├── context/
    │   │   └── AuthContext.jsx     # State global user
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   └── ChatPage.jsx        # Halaman utama
    │   ├── services/
    │   │   └── api.js              # Axios wrapper
    │   ├── App.jsx
    │   ├── App.css
    │   └── index.js
    ├── .env.example
    └── package.json
```

---

## ⚙️ Prasyarat

Pastikan sudah terinstall:
- **Node.js** v18+ → https://nodejs.org
- **PostgreSQL** v14+ → https://postgresql.org
- **Anthropic API Key** → https://console.anthropic.com

---

## 🚀 Cara Menjalankan

### 1. Setup Database PostgreSQL

```sql
-- Buka psql atau pgAdmin, jalankan:
CREATE DATABASE chatbot_jaringan;
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Salin dan isi file .env
cp .env.example .env
```

Edit file `.env`:
```env
PORT=5000
JWT_SECRET=isi_dengan_string_random_panjang

DB_HOST=localhost
DB_PORT=5432
DB_NAME=chatbot_jaringan
DB_USER=postgres
DB_PASSWORD=password_postgresql_kamu

ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

```bash
# Jalankan migrasi (buat tabel)
node src/config/migrate.js

# Jalankan server backend
npm run dev
# Server berjalan di http://localhost:5000
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Salin dan isi file .env
cp .env.example .env
```

Edit file `.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
# Jalankan frontend
npm start
# Buka http://localhost:3000
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Daftar akun baru |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Data user yang login |

### Chat (butuh token JWT)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/chats/new` | Buat session chat baru |
| GET | `/api/chats` | Ambil semua history chat |
| GET | `/api/chats/:id` | Ambil pesan satu session |
| DELETE | `/api/chats/:id` | Hapus session chat |
| POST | `/api/chat` | Kirim pesan & terima jawaban AI |

---

## 🗄️ Struktur Database

```sql
users
  id, name, email, password, created_at, updated_at

chat_sessions
  id, user_id, title, created_at, updated_at

chat_messages
  id, session_id, sender (user/bot), message, created_at
```

---

## ✨ Fitur

- ✅ Register & Login dengan JWT
- ✅ Buat chat baru
- ✅ Kirim pesan & terima jawaban AI (Claude)
- ✅ Auto-title dari pertanyaan pertama
- ✅ History chat di sidebar
- ✅ Buka percakapan lama
- ✅ Hapus chat dengan konfirmasi
- ✅ Loading indicator saat bot menjawab
- ✅ Konteks percakapan (10 pesan terakhir dikirim ke AI)
- ✅ Fokus hanya pada materi Jaringan Komputer

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| AI | Anthropic Claude API |
| Auth | JWT + bcryptjs |
| HTTP Client | Axios |
