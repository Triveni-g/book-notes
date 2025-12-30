# 📚 Book Notes App

A full-stack web application to manage personal book notes with secure authentication.

---

## 🚀 Features

- 🔐 Local authentication (Email & Password)
- 🔑 Google OAuth 2.0 login
- 👤 User-specific book management
- ➕ Add, ✏️ edit, 🗑️ delete books
- 🖼️ Fetch book covers using Open Library API
- 🛡️ Secure session-based authentication

---

## 🛠 Tech Stack

**Backend**
- Node.js
- Express.js
- PostgreSQL
- Passport.js (Local Strategy + Google OAuth)

**Frontend**
- EJS
- CSS

**Other Tools**
- bcrypt
- express-session
- dotenv
- Axios

---

## 🔐 Authentication Flow

- Local login with password hashing (bcrypt)
- Google OAuth 2.0 using Passport.js
- Sessions maintained using express-session
- User identity stored securely in PostgreSQL

---

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/book-notes-app.git
cd book-notes-app
2. Install dependencies
npm install
3. Create .env file
SESSION_SECRET=your_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

PG_USER=your_db_user
PG_PASSWORD=your_db_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=your_db_name

4. Run the server
npm start


Open in browser:

http://localhost:3000

🧪 Database Schema
Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

Books Table
CREATE TABLE books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  rating INTEGER,
  review TEXT,
  read_date DATE,
  cover_url TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

📌 Learning Outcomes

Deep understanding of OAuth 2.0 flow

Handling sessions and user serialization in Passport.js

Debugging real-world authentication issues

Managing PostgreSQL schemas and user-specific data

📄 License

This project is for learning and portfolio purposes.


---
