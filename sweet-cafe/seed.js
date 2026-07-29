const db = require('./db');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database...');

// Clear existing data (optional - comment out if you want to keep data)
db.exec(`DELETE FROM menu_items; DELETE FROM testimonials; DELETE FROM gallery; DELETE FROM contacts; DELETE FROM reservations; DELETE FROM settings; DELETE FROM admins;`);

// Reset auto-increment
db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('menu_items', 'testimonials', 'gallery', 'contacts', 'reservations', 'admins');`);

// Seed Menu Items
const menuItems = [
  { name: 'Velvet Latte', description: 'Double espresso with steamed oat milk and a hint of vanilla', price: 5.50, category: 'coffee', tag: 'Bestseller' },
  { name: 'Caramel Macchiato', description: 'Espresso marked with caramel drizzle and frothy milk', price: 6.00, category: 'coffee', tag: 'Popular' },
  { name: 'Cold Brew Reserve', description: '24-hour steeped cold brew with nitrogen infusion', price: 5.00, category: 'coffee', tag: null },
  { name: 'Matcha Ceremonial', description: 'Premium Japanese matcha whisked to perfection', price: 5.50, category: 'tea', tag: 'New' },
  { name: 'Earl Grey Lavender', description: 'Classic Earl Grey with organic lavender buds', price: 4.50, category: 'tea', tag: null },
  { name: 'Tiramisu Classico', description: 'Authentic Italian layers with mascarpone and espresso', price: 7.50, category: 'dessert', tag: "Chef's Pick" },
  { name: 'Almond Croissant', description: 'Buttery layers filled with sweet almond cream', price: 4.50, category: 'dessert', tag: null },
  { name: 'Affogato al Caffe', description: 'Vanilla gelato drowned in hot espresso shot', price: 6.50, category: 'coffee', tag: null },
  { name: 'Espresso Tonic', description: 'Refreshing blend of espresso and premium tonic water', price: 5.00, category: 'coffee', tag: 'Summer Special' },
  { name: 'Chai Latte', description: 'House-made spiced chai with steamed milk', price: 4.50, category: 'tea', tag: null },
  { name: 'Chocolate Fudge Cake', description: 'Rich dark chocolate cake with ganache frosting', price: 6.50, category: 'dessert', tag: 'Popular' },
  { name: 'Flat White', description: 'Double ristretto with velvety microfoam', price: 4.50, category: 'coffee', tag: null }
];

const insertMenu = db.prepare(`INSERT INTO menu_items (name, description, price, category, tag) VALUES (?, ?, ?, ?, ?)`);
menuItems.forEach(item => insertMenu.run(item.name, item.description, item.price, item.category, item.tag));

// Seed Testimonials
const testimonials = [
  { text: "The best coffee I've ever had outside of Italy. The atmosphere is incredibly warm and the staff treats you like family. Sweet Cafe has become my daily ritual.", author_name: 'Sarah Mitchell', author_role: 'Regular Customer', author_image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', rating: 5 },
  { text: "As a coffee snob, I'm picky about my brew. Sweet Cafe exceeded every expectation. Their single-origin Ethiopian pour-over is absolutely divine.", author_name: 'James Cooper', author_role: 'Food Blogger', author_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', rating: 5 },
  { text: "The perfect spot for remote work. Great WiFi, amazing coffee, and the almond croissants are dangerously addictive. Highly recommend!", author_name: 'Emma Liu', author_role: 'Freelance Designer', author_image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', rating: 5 },
  { text: "Found this gem last month and haven't stopped coming back. The caramel macchiato is perfection, and the staff remembers my name and order!", author_name: 'Michael Torres', author_role: 'Software Engineer', author_image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', rating: 5 }
];

const insertTestimonial = db.prepare(`INSERT INTO testimonials (text, author_name, author_role, author_image, rating) VALUES (?, ?, ?, ?, ?)`);
testimonials.forEach(t => insertTestimonial.run(t.text, t.author_name, t.author_role, t.author_image, t.rating));

// Seed Gallery
const gallery = [
  { title: 'Cozy Corner', image_url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&h=600&fit=crop', description: 'Our signature seating area', sort_order: 1 },
  { title: 'Latte Art', image_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&h=600&fit=crop', description: 'Handcrafted by our baristas', sort_order: 2 },
  { title: 'Fresh Roasts', image_url: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=500&h=600&fit=crop', description: 'Small batch roasted daily', sort_order: 3 },
  { title: 'Garden Patio', image_url: 'https://images.unsplash.com/photo-1463797221720-6b07e6426c24?w=500&h=600&fit=crop', description: 'Outdoor seating area', sort_order: 4 },
  { title: 'Fresh Pastries', image_url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=500&h=600&fit=crop', description: 'Baked fresh every morning', sort_order: 5 },
  { title: 'Barista Station', image_url: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=500&h=600&fit=crop', description: 'Where the magic happens', sort_order: 6 }
];

const insertGallery = db.prepare(`INSERT INTO gallery (title, image_url, description, sort_order) VALUES (?, ?, ?, ?)`);
gallery.forEach(g => insertGallery.run(g.title, g.image_url, g.description, g.sort_order));

// Seed Settings
const settings = [
  { key: 'cafe_name', value: 'Sweet Cafe' },
  { key: 'tagline', value: 'Brewing Moments Of Pure Joy' },
  { key: 'address', value: '123 Brew Avenue, Coffee District, New York, NY 10001' },
  { key: 'phone', value: '(555) 123-4567' },
  { key: 'email', value: 'hello@sweetcafe.com' },
  { key: 'hours_weekday', value: '7am - 8pm' },
  { key: 'hours_weekend', value: '8am - 9pm' },
  { key: 'instagram', value: '@sweetcafe' },
  { key: 'facebook', value: 'SweetCafeOfficial' },
  { key: 'twitter', value: '@sweetcafe' }
];

const insertSetting = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
settings.forEach(s => insertSetting.run(s.key, s.value));

// Seed Admin (default: admin / admin123)
const adminPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)`).run('admin', adminPassword);

console.log('✅ Database seeded successfully!');
console.log(`📊 Stats: ${menuItems.length} menu items, ${testimonials.length} testimonials, ${gallery.length} gallery items`);
console.log('🔐 Default admin credentials: username=admin, password=admin123');
