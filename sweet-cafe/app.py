from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import os
import jwt
import datetime
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='public')
CORS(app)
app.config['SECRET_KEY'] = 'sweet-cafe-secret-key-2024-change-in-production'
app.config['DATABASE'] = os.path.join(os.path.dirname(__file__), 'database.sqlite')

# ==================== DATABASE HELPERS ====================
def get_db():
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS menu_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            tag TEXT,
            image_url TEXT,
            is_available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS testimonials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_role TEXT,
            author_image TEXT,
            rating INTEGER DEFAULT 5,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            image_url TEXT NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            guests INTEGER DEFAULT 2,
            notes TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()
    conn.close()
    print('Database initialized!')

def seed_db():
    conn = get_db()

    count = conn.execute('SELECT COUNT(*) FROM menu_items').fetchone()[0]
    if count > 0:
        print('Database already seeded.')
        conn.close()
        return

    menu_items = [
        ('Velvet Latte', 'Double espresso with steamed oat milk and a hint of vanilla', 5.50, 'coffee', 'Bestseller'),
        ('Caramel Macchiato', 'Espresso marked with caramel drizzle and frothy milk', 6.00, 'coffee', 'Popular'),
        ('Cold Brew Reserve', '24-hour steeped cold brew with nitrogen infusion', 5.00, 'coffee', None),
        ('Matcha Ceremonial', 'Premium Japanese matcha whisked to perfection', 5.50, 'tea', 'New'),
        ('Earl Grey Lavender', 'Classic Earl Grey with organic lavender buds', 4.50, 'tea', None),
        ('Tiramisu Classico', 'Authentic Italian layers with mascarpone and espresso', 7.50, 'dessert', "Chef's Pick"),
        ('Almond Croissant', 'Buttery layers filled with sweet almond cream', 4.50, 'dessert', None),
        ('Affogato al Caffe', 'Vanilla gelato drowned in hot espresso shot', 6.50, 'coffee', None),
        ('Espresso Tonic', 'Refreshing blend of espresso and premium tonic water', 5.00, 'coffee', 'Summer Special'),
        ('Chai Latte', 'House-made spiced chai with steamed milk', 4.50, 'tea', None),
        ('Chocolate Fudge Cake', 'Rich dark chocolate cake with ganache frosting', 6.50, 'dessert', 'Popular'),
        ('Flat White', 'Double ristretto with velvety microfoam', 4.50, 'coffee', None),
    ]
    conn.executemany('INSERT INTO menu_items (name, description, price, category, tag) VALUES (?,?,?,?,?)', menu_items)

    testimonials = [
        ("The best coffee I've ever had outside of Italy. The atmosphere is incredibly warm and the staff treats you like family. Sweet Cafe has become my daily ritual.", 'Sarah Mitchell', 'Regular Customer', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', 5),
        ("As a coffee snob, I'm picky about my brew. Sweet Cafe exceeded every expectation. Their single-origin Ethiopian pour-over is absolutely divine.", 'James Cooper', 'Food Blogger', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', 5),
        ("The perfect spot for remote work. Great WiFi, amazing coffee, and the almond croissants are dangerously addictive. Highly recommend!", 'Emma Liu', 'Freelance Designer', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', 5),
        ("Found this gem last month and haven't stopped coming back. The caramel macchiato is perfection, and the staff remembers my name and order!", 'Michael Torres', 'Software Engineer', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', 5),
    ]
    conn.executemany('INSERT INTO testimonials (text, author_name, author_role, author_image, rating) VALUES (?,?,?,?,?)', testimonials)

    gallery = [
        ('Cozy Corner', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&h=600&fit=crop', 'Our signature seating area', 1),
        ('Latte Art', 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&h=600&fit=crop', 'Handcrafted by our baristas', 2),
        ('Fresh Roasts', 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&h=600&fit=crop', 'Small batch roasted daily', 3),
        ('Garden Patio', 'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=500&h=600&fit=crop', 'Outdoor seating area', 4),
        ('Fresh Pastries', 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500&h=600&fit=crop', 'Baked fresh every morning', 5),
        ('Barista Station', 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&h=600&fit=crop', 'Where the magic happens', 6),
    ]
    conn.executemany('INSERT INTO gallery (title, image_url, description, sort_order) VALUES (?,?,?,?)', gallery)

    settings = [
        ('cafe_name', 'Sweet Cafe'),
        ('tagline', 'Brewing Moments Of Pure Joy'),
        ('address', '123 Brew Avenue, Coffee District, New York, NY 10001'),
        ('phone', '(555) 123-4567'),
        ('email', 'hello@sweetcafe.com'),
        ('hours_weekday', '7am - 8pm'),
        ('hours_weekend', '8am - 9pm'),
        ('instagram', '@sweetcafe'),
        ('facebook', 'SweetCafeOfficial'),
        ('twitter', '@sweetcafe'),
    ]
    conn.executemany('INSERT INTO settings (key, value) VALUES (?,?)', settings)

    pw_hash = generate_password_hash('admin123')
    conn.execute('INSERT INTO admins (username, password_hash) VALUES (?,?)', ('admin', pw_hash))

    conn.commit()
    conn.close()
    print('Database seeded successfully!')

# ==================== AUTH ====================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

# ==================== PUBLIC ROUTES ====================

@app.route('/api/menu', methods=['GET'])
def get_menu():
    category = request.args.get('category', 'all')
    conn = get_db()
    if category and category != 'all':
        items = conn.execute('SELECT * FROM menu_items WHERE is_available = 1 AND category = ? ORDER BY category, name', (category,)).fetchall()
    else:
        items = conn.execute('SELECT * FROM menu_items WHERE is_available = 1 ORDER BY category, name').fetchall()
    conn.close()
    return jsonify({'success': True, 'count': len(items), 'data': [dict(row) for row in items]})

@app.route('/api/menu/<int:id>', methods=['GET'])
def get_menu_item(id):
    conn = get_db()
    item = conn.execute('SELECT * FROM menu_items WHERE id = ?', (id,)).fetchone()
    conn.close()
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404
    return jsonify({'success': True, 'data': dict(item)})

@app.route('/api/testimonials', methods=['GET'])
def get_testimonials():
    conn = get_db()
    items = conn.execute('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify({'success': True, 'count': len(items), 'data': [dict(row) for row in items]})

@app.route('/api/gallery', methods=['GET'])
def get_gallery():
    conn = get_db()
    items = conn.execute('SELECT * FROM gallery ORDER BY sort_order').fetchall()
    conn.close()
    return jsonify({'success': True, 'count': len(items), 'data': [dict(row) for row in items]})

@app.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db()
    rows = conn.execute('SELECT key, value FROM settings').fetchall()
    conn.close()
    settings = {row['key']: row['value'] for row in rows}
    return jsonify({'success': True, 'data': settings})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    menu_count = conn.execute('SELECT COUNT(*) as c FROM menu_items WHERE is_available = 1').fetchone()['c']
    testimonial_count = conn.execute('SELECT COUNT(*) as c FROM testimonials WHERE is_active = 1').fetchone()['c']
    contact_count = conn.execute('SELECT COUNT(*) as c FROM contacts').fetchone()['c']
    reservation_count = conn.execute('SELECT COUNT(*) as c FROM reservations').fetchone()['c']
    conn.close()
    return jsonify({'success': True, 'data': {
        'menuItems': menu_count,
        'testimonials': testimonial_count,
        'totalContacts': contact_count,
        'totalReservations': reservation_count,
        'baristas': 12,
        'happyCustomers': 5000
    }})

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'Name, email, and message are required'}), 400

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO contacts (name, email, phone, message) VALUES (?,?,?,?)',
        (name, email, phone, message)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Thank you for your message! We will get back to you soon.', 'id': cursor.lastrowid}), 201

@app.route('/api/reservations', methods=['POST'])
def make_reservation():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    date = data.get('date')
    time = data.get('time')
    guests = data.get('guests', 2)
    notes = data.get('notes')

    if not name or not email or not date or not time:
        return jsonify({'error': 'Name, email, date, and time are required'}), 400

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO reservations (name, email, phone, date, time, guests, notes) VALUES (?,?,?,?,?,?,?)',
        (name, email, phone, date, time, guests, notes)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Reservation request received! We will confirm shortly.', 'id': cursor.lastrowid}), 201

# ==================== ADMIN ROUTES ====================

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400

    conn = get_db()
    admin = conn.execute('SELECT * FROM admins WHERE username = ?', (username,)).fetchone()
    conn.close()

    if not admin or not check_password_hash(admin['password_hash'], password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode(
        {'id': admin['id'], 'username': admin['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )
    return jsonify({'success': True, 'token': token, 'username': admin['username']})

@app.route('/api/admin/stats', methods=['GET'])
@token_required
def admin_stats(current_user):
    conn = get_db()
    total_contacts = conn.execute('SELECT COUNT(*) as c FROM contacts').fetchone()['c']
    unread_contacts = conn.execute('SELECT COUNT(*) as c FROM contacts WHERE is_read = 0').fetchone()['c']
    total_reservations = conn.execute('SELECT COUNT(*) as c FROM reservations').fetchone()['c']
    pending_reservations = conn.execute("SELECT COUNT(*) as c FROM reservations WHERE status = 'pending'").fetchone()['c']
    total_menu = conn.execute('SELECT COUNT(*) as c FROM menu_items').fetchone()['c']
    total_testimonials = conn.execute('SELECT COUNT(*) as c FROM testimonials').fetchone()['c']

    recent_contacts = conn.execute('SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5').fetchall()
    recent_reservations = conn.execute('SELECT * FROM reservations ORDER BY created_at DESC LIMIT 5').fetchall()
    conn.close()

    return jsonify({
        'success': True,
        'stats': {
            'totalContacts': total_contacts,
            'unreadContacts': unread_contacts,
            'totalReservations': total_reservations,
            'pendingReservations': pending_reservations,
            'totalMenuItems': total_menu,
            'totalTestimonials': total_testimonials
        },
        'recentContacts': [dict(row) for row in recent_contacts],
        'recentReservations': [dict(row) for row in recent_reservations]
    })

@app.route('/api/admin/contacts', methods=['GET'])
@token_required
def admin_contacts(current_user):
    conn = get_db()
    items = conn.execute('SELECT * FROM contacts ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify({'success': True, 'count': len(items), 'data': [dict(row) for row in items]})

@app.route('/api/admin/contacts/<int:id>/read', methods=['PATCH'])
@token_required
def mark_contact_read(current_user, id):
    conn = get_db()
    conn.execute('UPDATE contacts SET is_read = 1 WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Contact marked as read'})

@app.route('/api/admin/contacts/<int:id>', methods=['DELETE'])
@token_required
def delete_contact(current_user, id):
    conn = get_db()
    conn.execute('DELETE FROM contacts WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Contact deleted'})

@app.route('/api/admin/reservations', methods=['GET'])
@token_required
def admin_reservations(current_user):
    conn = get_db()
    items = conn.execute('SELECT * FROM reservations ORDER BY created_at DESC').fetchall()
    conn.close()
    return jsonify({'success': True, 'count': len(items), 'data': [dict(row) for row in items]})

@app.route('/api/admin/reservations/<int:id>/status', methods=['PATCH'])
@token_required
def update_reservation_status(current_user, id):
    status = request.get_json().get('status')
    if status not in ['pending', 'confirmed', 'cancelled']:
        return jsonify({'error': 'Invalid status'}), 400
    conn = get_db()
    conn.execute('UPDATE reservations SET status = ? WHERE id = ?', (status, id))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Reservation status updated'})

@app.route('/api/admin/reservations/<int:id>', methods=['DELETE'])
@token_required
def delete_reservation(current_user, id):
    conn = get_db()
    conn.execute('DELETE FROM reservations WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Reservation deleted'})

@app.route('/api/admin/menu', methods=['POST'])
@token_required
def add_menu_item(current_user):
    data = request.get_json()
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO menu_items (name, description, price, category, tag, image_url) VALUES (?,?,?,?,?,?)',
        (data.get('name'), data.get('description'), data.get('price'), data.get('category'), data.get('tag'), data.get('image_url'))
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': cursor.lastrowid}), 201

@app.route('/api/admin/menu/<int:id>', methods=['PATCH'])
@token_required
def update_menu_item(current_user, id):
    data = request.get_json()
    conn = get_db()
    conn.execute(
        'UPDATE menu_items SET name=?, description=?, price=?, category=?, tag=?, image_url=?, is_available=? WHERE id=?',
        (data.get('name'), data.get('description'), data.get('price'), data.get('category'), data.get('tag'), data.get('image_url'), data.get('is_available', 1), id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Menu item updated'})

@app.route('/api/admin/menu/<int:id>', methods=['DELETE'])
@token_required
def delete_menu_item(current_user, id):
    conn = get_db()
    conn.execute('DELETE FROM menu_items WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Menu item deleted'})

@app.route('/api/admin/testimonials', methods=['POST'])
@token_required
def add_testimonial(current_user):
    data = request.get_json()
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO testimonials (text, author_name, author_role, author_image, rating) VALUES (?,?,?,?,?)',
        (data.get('text'), data.get('author_name'), data.get('author_role'), data.get('author_image'), data.get('rating', 5))
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'id': cursor.lastrowid}), 201

@app.route('/api/admin/testimonials/<int:id>', methods=['PATCH'])
@token_required
def update_testimonial(current_user, id):
    data = request.get_json()
    conn = get_db()
    conn.execute(
        'UPDATE testimonials SET text=?, author_name=?, author_role=?, author_image=?, rating=?, is_active=? WHERE id=?',
        (data.get('text'), data.get('author_name'), data.get('author_role'), data.get('author_image'), data.get('rating'), data.get('is_active', 1), id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Testimonial updated'})

@app.route('/api/admin/testimonials/<int:id>', methods=['DELETE'])
@token_required
def delete_testimonial(current_user, id):
    conn = get_db()
    conn.execute('DELETE FROM testimonials WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Testimonial deleted'})

@app.route('/api/admin/settings', methods=['PATCH'])
@token_required
def update_settings(current_user):
    data = request.get_json()
    conn = get_db()
    for key, value in data.items():
        conn.execute('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', (key, value))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Settings updated'})

# ==================== STATIC FILES ====================

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/admin')
def admin():
    return send_from_directory('public', 'admin.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('public', path)

# ==================== MAIN ====================

if __name__ == '__main__':
    init_db()
    seed_db()
    print("========================================")
    print("  SWEET CAFE SERVER RUNNING")
    print("========================================")
    print("  Website:   http://localhost:5000")
    print("  Admin:     http://localhost:5000/admin")
    print("  API:       http://localhost:5000/api")
    print("========================================")
    print("  Login: admin / admin123")
    print("========================================")
    app.run(host='0.0.0.0', port=5000, debug=True)
