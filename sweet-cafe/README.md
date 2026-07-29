# Sweet Cafe - Full Stack Coffee Shop Website

A modern, full-stack web application for Sweet Cafe with **both Node.js and Python backends**.

---

## OPTION 1: Python Backend (Recommended - Easiest)

No Node.js needed! Just Python + Flask.

### Step 1: Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Run the server
```bash
python app.py
```

### Step 3: Open in browser
- **Website**: http://localhost:5000
- **Admin Panel**: http://localhost:5000/admin
- **Login**: `admin` / `admin123`

---

## OPTION 2: Node.js Backend

Requires Node.js installed from https://nodejs.org

### Step 1: Install dependencies
```bash
npm install
```

### Step 2: Seed the database
```bash
npm run seed
```

### Step 3: Start the server
```bash
npm start
```

### Step 4: Open in browser
- **Website**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Login**: `admin` / `admin123`

---

## Features

### Frontend (Customer Website)
- Modern dark theme with glassmorphism effects
- Custom animated cursor
- Particle animations
- Scroll reveal animations
- Responsive design (mobile, tablet, desktop)
- Dynamic menu filtering (fetched from database)
- Testimonial carousel (fetched from database)
- Horizontal scrolling gallery (fetched from database)
- Toast notifications
- Contact form (saves to database)
- Table reservation modal (saves to database)

### Backend (Python Flask or Node.js)
- REST API with full CRUD operations
- SQLite database (zero-config, file-based)
- JWT authentication for admin panel
- Contact form submissions
- Table reservations
- Menu management
- Testimonial management

### Admin Dashboard
- Secure login with JWT
- Dashboard overview with stats
- Menu management (add/edit/delete)
- Reservation management (confirm/cancel/delete)
- Contact message inbox (mark as read/delete)
- Testimonial management (add/edit/delete)

---

## Project Structure

```
sweet-cafe/
├── app.py              # Python Flask backend (RECOMMENDED)
├── requirements.txt    # Python dependencies
├── server.js           # Node.js Express backend (alternative)
├── db.js               # Node.js database setup
├── seed.js             # Node.js database seeder
├── package.json        # Node.js dependencies
├── .env                # Environment variables
├── .gitignore
├── README.md
└── public/
    ├── index.html      # Customer-facing website
    └── admin.html      # Admin dashboard
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `menu_items` | Coffee, tea, desserts |
| `testimonials` | Customer reviews |
| `gallery` | Photo gallery |
| `contacts` | Contact form submissions |
| `reservations` | Table bookings |
| `settings` | Cafe info (address, hours, etc.) |
| `admins` | Admin accounts |

---

## API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu?category=` | Get menu items |
| GET | `/api/testimonials` | Get testimonials |
| GET | `/api/gallery` | Get gallery |
| GET | `/api/settings` | Get cafe settings |
| POST | `/api/contact` | Submit contact form |
| POST | `/api/reservations` | Make reservation |

### Admin (Requires JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/stats` | Dashboard stats |
| GET | `/api/admin/contacts` | All messages |
| GET | `/api/admin/reservations` | All reservations |
| POST | `/api/admin/menu` | Add menu item |
| PATCH | `/api/admin/menu/:id` | Update menu item |
| DELETE | `/api/admin/menu/:id` | Delete menu item |
| POST | `/api/admin/testimonials` | Add testimonial |
| DELETE | `/api/admin/testimonials/:id` | Delete testimonial |

---

## Tech Stack

| Layer | Python Version | Node.js Version |
|-------|---------------|-----------------|
| Backend | Flask + SQLite | Express + better-sqlite3 |
| Auth | PyJWT + Werkzeug | jsonwebtoken + bcryptjs |
| Frontend | HTML5, CSS3, Vanilla JS | Same |
| Security | CORS | Helmet + Rate Limit + CORS |

---

## Troubleshooting

### "npm is not recognized"
Use the **Python backend** instead! Just run `python app.py`.

### "pip is not recognized"
Download Python from https://python.org and check "Add to PATH" during installation.

### Port already in use
Change the port in `app.py` (line at bottom: `port=5000`) or `.env` file.

---

## License

MIT License - free for personal and commercial use.

Crafted with caffeine and love
