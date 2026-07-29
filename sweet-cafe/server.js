require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sweet-cafe-secret-key-2024';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// ==================== PUBLIC API ROUTES ====================

// Get all menu items (with optional category filter)
app.get('/api/menu', (req, res) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM menu_items WHERE is_available = 1';
    let params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, name';

    const items = db.prepare(query).all(...params);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single menu item
app.get('/api/menu/:id', (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all testimonials
app.get('/api/testimonials', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY created_at DESC').all();
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get gallery items
app.get('/api/gallery', (req, res) => {
  try {
    const items = db.prepare('SELECT * FROM gallery ORDER BY sort_order').all();
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get cafe settings
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit contact form
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = db.prepare(
      'INSERT INTO contacts (name, email, phone, message) VALUES (?, ?, ?, ?)'
    ).run(name, email, phone || null, message);

    res.status(201).json({ 
      success: true, 
      message: 'Thank you for your message! We will get back to you soon.',
      id: result.lastInsertRowid 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Make a reservation
app.post('/api/reservations', (req, res) => {
  try {
    const { name, email, phone, date, time, guests, notes } = req.body;

    if (!name || !email || !date || !time) {
      return res.status(400).json({ error: 'Name, email, date, and time are required' });
    }

    const result = db.prepare(
      'INSERT INTO reservations (name, email, phone, date, time, guests, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, email, phone || null, date, time, guests || 2, notes || null);

    res.status(201).json({ 
      success: true, 
      message: 'Reservation request received! We will confirm shortly.',
      id: result.lastInsertRowid 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get stats for frontend
app.get('/api/stats', (req, res) => {
  try {
    const menuCount = db.prepare('SELECT COUNT(*) as count FROM menu_items WHERE is_available = 1').get();
    const testimonialCount = db.prepare('SELECT COUNT(*) as count FROM testimonials WHERE is_active = 1').get();
    const contactCount = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const reservationCount = db.prepare('SELECT COUNT(*) as count FROM reservations').get();

    res.json({
      success: true,
      data: {
        menuItems: menuCount.count,
        testimonials: testimonialCount.count,
        totalContacts: contactCount.count,
        totalReservations: reservationCount.count,
        baristas: 12,
        happyCustomers: 5000
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ADMIN API ROUTES ====================

// Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

    if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ success: true, token, username: admin.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  try {
    const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get();
    const unreadContacts = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE is_read = 0').get();
    const totalReservations = db.prepare('SELECT COUNT(*) as count FROM reservations').get();
    const pendingReservations = db.prepare('SELECT COUNT(*) as count FROM reservations WHERE status = ?').get('pending');
    const totalMenuItems = db.prepare('SELECT COUNT(*) as count FROM menu_items').get();
    const totalTestimonials = db.prepare('SELECT COUNT(*) as count FROM testimonials').get();

    // Recent contacts
    const recentContacts = db.prepare(
      'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5'
    ).all();

    // Recent reservations
    const recentReservations = db.prepare(
      'SELECT * FROM reservations ORDER BY created_at DESC LIMIT 5'
    ).all();

    res.json({
      success: true,
      stats: {
        totalContacts: totalContacts.count,
        unreadContacts: unreadContacts.count,
        totalReservations: totalReservations.count,
        pendingReservations: pendingReservations.count,
        totalMenuItems: totalMenuItems.count,
        totalTestimonials: totalTestimonials.count
      },
      recentContacts,
      recentReservations
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all contacts (admin)
app.get('/api/admin/contacts', authenticateToken, (req, res) => {
  try {
    const contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
    res.json({ success: true, count: contacts.length, data: contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark contact as read
app.patch('/api/admin/contacts/:id/read', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE contacts SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Contact marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete contact
app.delete('/api/admin/contacts/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all reservations (admin)
app.get('/api/admin/reservations', authenticateToken, (req, res) => {
  try {
    const reservations = db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all();
    res.json({ success: true, count: reservations.length, data: reservations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update reservation status
app.patch('/api/admin/reservations/:id/status', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, message: 'Reservation status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete reservation
app.delete('/api/admin/reservations/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM reservations WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Reservation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Menu Items (admin)
app.post('/api/admin/menu', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category, tag, image_url } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const result = db.prepare(
      'INSERT INTO menu_items (name, description, price, category, tag, image_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, description || null, price, category, tag || null, image_url || null);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/menu/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, price, category, tag, image_url, is_available } = req.body;

    db.prepare(
      'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, tag = ?, image_url = ?, is_available = ? WHERE id = ?'
    ).run(name, description, price, category, tag, image_url, is_available, req.params.id);

    res.json({ success: true, message: 'Menu item updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/menu/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD Testimonials (admin)
app.post('/api/admin/testimonials', authenticateToken, (req, res) => {
  try {
    const { text, author_name, author_role, author_image, rating } = req.body;

    if (!text || !author_name) {
      return res.status(400).json({ error: 'Text and author name are required' });
    }

    const result = db.prepare(
      'INSERT INTO testimonials (text, author_name, author_role, author_image, rating) VALUES (?, ?, ?, ?, ?)'
    ).run(text, author_name, author_role || null, author_image || null, rating || 5);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/testimonials/:id', authenticateToken, (req, res) => {
  try {
    const { text, author_name, author_role, author_image, rating, is_active } = req.body;

    db.prepare(
      'UPDATE testimonials SET text = ?, author_name = ?, author_role = ?, author_image = ?, rating = ?, is_active = ? WHERE id = ?'
    ).run(text, author_name, author_role, author_image, rating, is_active, req.params.id);

    res.json({ success: true, message: 'Testimonial updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/testimonials/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings (admin)
app.patch('/api/admin/settings', authenticateToken, (req, res) => {
  try {
    const updates = req.body;
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');

    Object.entries(updates).forEach(([key, value]) => {
      stmt.run(key, value);
    });

    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== FRONTEND ROUTES ====================

// Serve main frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║                                                ║
║     ☕  SWEET CAFE SERVER RUNNING  ☕          ║
║                                                ║
║  🌐 Frontend: http://localhost:${PORT}              ║
║  ⚙️  Admin:   http://localhost:${PORT}/admin        ║
║  📡 API:      http://localhost:${PORT}/api          ║
║                                                ║
║  🔐 Admin Login:                               ║
║     Username: admin                            ║
║     Password: admin123                         ║
║                                                ║
╚════════════════════════════════════════════════╝
  `);
});
