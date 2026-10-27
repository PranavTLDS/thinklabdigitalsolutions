const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const dbPath = path.join(dataDir, 'thinklab.db');
const db = new DatabaseSync(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT,
    budget TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'New',
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT,
    booking_date TEXT,
    booking_time TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Confirmed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS careers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    position TEXT NOT NULL,
    portfolio TEXT,
    linkedin TEXT,
    cover_letter TEXT,
    resume_filename TEXT,
    resume_original_name TEXT,
    status TEXT DEFAULT 'New',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS newsletters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'Website Footer',
    status TEXT DEFAULT 'Subscribed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS case_studies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    tag TEXT DEFAULT 'CASE STUDY',
    year TEXT DEFAULT '2026',
    description TEXT,
    image_url TEXT,
    metric1_val TEXT,
    metric1_lbl TEXT,
    metric2_val TEXT,
    metric2_lbl TEXT,
    link_url TEXT,
    order_idx INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cms_pages (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'published',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cms_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_slug TEXT NOT NULL,
    section_key TEXT NOT NULL,
    section_name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_visible INTEGER DEFAULT 1,
    content_json TEXT NOT NULL,
    styles_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_slug, section_key)
  );
`);

// Seed default case studies if empty
try {
  const count = db.prepare('SELECT COUNT(*) as count FROM case_studies').get();
  if (count.count === 0) {
    const seedStmt = db.prepare(`
      INSERT INTO case_studies (title, tag, year, description, image_url, metric1_val, metric1_lbl, metric2_val, metric2_lbl, link_url, order_idx)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    seedStmt.run(
      'Hreemkar Papers',
      'MANUFACTURING & SUPPLY',
      '2026',
      'Corporate Website for Paper Manufacturing & Supply Company. We engineered a conversion-focused digital presence that positions them as industry leaders.',
      'https://framerusercontent.com/images/9OzCOU8OyDs8HtnP9x5VLyaFopo.jpg?width=3360&height=3360',
      '+70%',
      'Increase in business enquiries',
      '+52%',
      'Growth in product page visits',
      '/case-studies/hreemkarpapers',
      1
    );

    seedStmt.run(
      'ELEVEX Rentals',
      'CONSTRUCTION & EQUIPMENT',
      '2026',
      'Modern equipment rental & fleet management platform. Built to drive instant quote requests and streamline client booking workflows.',
      'https://framerusercontent.com/images/k20f8g7g6QpU4gRkLg2eQp3bU.jpg?width=3360&height=3360',
      '+85%',
      'Lead qualification rate',
      '3.2x',
      'Higher booking conversions',
      '/case-studies/elevex-rentals',
      2
    );

    seedStmt.run(
      'Geeta Home Appliances',
      'SHOPIFY E-COMMERCE',
      '2026',
      'A complete E-commerce foundation designed to help Geeta Home Appliances establish its online sales channel and scale its digital product catalogue.',
      'https://framerusercontent.com/images/328V6xErk5LhjNrztZYCgjvA.jpg?width=1280&height=1280',
      '100+',
      'Product Catalogue Capacity',
      '+40%',
      'Projected Organic Traffic Growth',
      '/case-studies/geeta-home-appliances',
      3
    );

    seedStmt.run(
      'Sandhatri Group',
      'REAL ESTATE & INFRASTRUCTURE',
      '2026',
      'Luxury residential real estate showcase for Amara One. Built to convert high-net-worth investors with interactive virtual tours.',
      'https://framerusercontent.com/images/328V6xErk5LhjNrztZYCgjvA.jpg?width=1280&height=1280',
      '+120%',
      'Site visit appointments',
      '45 Days',
      'Record launch phase sellout',
      '/case-studies/sandhatri-amaraone',
      4
    );

    console.log('Seeded 4 default case studies into database.');
  }
} catch (e) {
  console.warn('Case studies seed check error:', e.message);
}

// Seed CMS pages and default sections if empty
try {
  const pageCount = db.prepare('SELECT COUNT(*) as count FROM cms_pages').get();
  if (pageCount.count === 0) {
    const insertPage = db.prepare(`INSERT OR IGNORE INTO cms_pages (slug, title, status) VALUES (?, ?, 'published')`);
    const insertSection = db.prepare(`
      INSERT OR IGNORE INTO cms_sections (page_slug, section_key, section_name, display_order, is_visible, content_json, styles_json)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `);

    const pages = [
      { slug: 'home', title: 'Home Page' },
      { slug: 'about-us', title: 'About Us' },
      { slug: 'services', title: 'Services' },
      { slug: 'case-studies', title: 'Case Studies' },
      { slug: 'reviews', title: 'Reviews' },
      { slug: 'blogs', title: 'Blogs' },
      { slug: 'careers', title: 'Careers' },
      { slug: 'contact-us', title: 'Contact Us' }
    ];

    pages.forEach(p => insertPage.run(p.slug, p.title));

    // Default Sections for Home Page
    insertSection.run(
      'home', 'hero', 'Hero Section', 1,
      JSON.stringify({
        badge: 'DIGITAL MARKETING AGENCY',
        title: 'Scale Your Business With Precision Marketing',
        subtitle: 'We engineer custom web platforms, data-driven performance marketing, and end-to-end automation systems that drive measurable revenue.',
        primaryBtnText: 'Book Strategy Consultation',
        primaryBtnLink: '/contact-us',
        secondaryBtnText: 'Explore Projects',
        secondaryBtnLink: '/case-studies'
      }),
      JSON.stringify({
        bgMode: 'ambient-glow',
        glowColor: '#7e6ff0',
        glowColorSecondary: '#f58327',
        glowIntensity: 12,
        glassBlur: 16,
        paddingY: 'spacious'
      })
    );

    insertSection.run(
      'home', 'marquee', 'Ticker Marquee', 2,
      JSON.stringify({
        text: 'SEO & Search Dominance • Meta & Google Ads • Custom Web Platforms • Workflow & AI Automation • Brand Strategy & Identity'
      }),
      JSON.stringify({
        bgMode: 'void-black',
        glowColor: '#7e6ff0',
        glowIntensity: 0,
        glassBlur: 0,
        paddingY: 'compact'
      })
    );

    insertSection.run(
      'home', 'philosophy', 'Agency Philosophy & Impact', 3,
      JSON.stringify({
        badge: 'ABOUT THINKLAB',
        title: 'Engineering Digital Dominance for Ambitious Brands',
        description: 'ThinkLab Digital Solutions combines analytical rigor with world-class design to build scalable engines of client acquisition.',
        stat1_val: '40+',
        stat1_lbl: 'Projects Delivered',
        stat2_val: '99%',
        stat2_lbl: 'Client Retention',
        stat3_val: '₹15Cr+',
        stat3_lbl: 'Client Revenue Generated'
      }),
      JSON.stringify({
        bgMode: 'ambient-glow',
        glowColor: '#7e6ff0',
        glowIntensity: 10,
        glassBlur: 16,
        paddingY: 'normal'
      })
    );

    insertSection.run(
      'home', 'services', 'Core Services Grid', 4,
      JSON.stringify({
        badge: 'OUR CAPABILITIES',
        title: 'End-to-End Digital Solutions',
        subtitle: 'High-impact services engineered to drive organic reach, paid efficiency, and automated workflows.',
        items: [
          { title: 'SEO & Search Dominance', desc: 'Technical SEO and programmatic search rankings.', icon: '🔍', link: '/services' },
          { title: 'Google & Meta Advertising', desc: 'High-conversion performance advertising pipelines.', icon: '📈', link: '/services' },
          { title: 'Custom Web Platforms', desc: 'Fluid Framer & bespoke web engineering.', icon: '💻', link: '/services' },
          { title: 'Workflow Automation', desc: 'AI-driven operational and CRM pipelines.', icon: '⚡', link: '/services' }
        ]
      }),
      JSON.stringify({
        bgMode: 'ambient-glow',
        glowColor: '#7e6ff0',
        glowIntensity: 15,
        glassBlur: 24,
        paddingY: 'spacious'
      })
    );

    insertSection.run(
      'home', 'cta', 'Bottom CTA Banner', 5,
      JSON.stringify({
        title: 'Ready to Accelerate Your Digital Growth?',
        subtitle: 'Reserve a 1-on-1 discovery consultation with our strategy and growth engineers.',
        btnText: 'Schedule Consultation',
        btnLink: '/contact-us'
      }),
      JSON.stringify({
        bgMode: 'ambient-glow',
        glowColor: '#f58327',
        glowIntensity: 18,
        glassBlur: 20,
        paddingY: 'spacious'
      })
    );

    // Default Sections for About Us
    insertSection.run(
      'about-us', 'hero', 'Hero Banner', 1,
      JSON.stringify({
        badge: 'WHO WE ARE',
        title: 'Architects of Modern Digital Growth',
        subtitle: 'ThinkLab Digital Solutions is an international digital agency headquartered in Vijayawada with active operations in Mascot, Sydney.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    insertSection.run(
      'about-us', 'mission', 'Mission & Global Presence', 2,
      JSON.stringify({
        title: 'Driven by Results, Defined by Excellence',
        description: 'Our mission is to help ambitious businesses convert traffic into high-value relationships through world-class creative and automation.',
        office1: 'Vijayawada, Andhra Pradesh, India',
        office2: 'Mascot, Sydney, Australia'
      }),
      JSON.stringify({ bgMode: 'void-black', glowColor: '#7e6ff0', glowIntensity: 8, glassBlur: 16, paddingY: 'normal' })
    );

    // Default Sections for Services
    insertSection.run(
      'services', 'hero', 'Services Header', 1,
      JSON.stringify({
        badge: 'SPECIALIZED EXPERTISE',
        title: 'Full-Funnel Digital Services',
        subtitle: 'From search engine dominance and precision paid acquisition to custom web development and AI-driven CRM automations.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    // Default Sections for Case Studies
    insertSection.run(
      'case-studies', 'hero', 'Case Studies Header', 1,
      JSON.stringify({
        badge: 'PROVEN IMPACT',
        title: 'Real Results for Growing Brands',
        subtitle: 'Explore our recent client transformations, verified ROI metrics, and conversion-engineered web platforms.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    // Default Sections for Reviews
    insertSection.run(
      'reviews', 'hero', 'Reviews Header', 1,
      JSON.stringify({
        badge: 'CLIENT TESTIMONIALS',
        title: 'Endorsed by Industry Leaders',
        subtitle: 'Read genuine reviews and success stories from founders, directors, and marketing leaders who partnered with ThinkLab.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    // Default Sections for Blogs
    insertSection.run(
      'blogs', 'hero', 'Blogs Header', 1,
      JSON.stringify({
        badge: 'KNOWLEDGE BASE',
        title: 'Strategies, Guides & Digital Trends',
        subtitle: 'Actionable perspectives on performance marketing, AI automation, and web design from the ThinkLab engineering team.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    // Default Sections for Careers
    insertSection.run(
      'careers', 'hero', 'Careers Header', 1,
      JSON.stringify({
        badge: 'WE ARE HIRING',
        title: 'Build Your Career at ThinkLab',
        subtitle: 'Join a high-performance culture of designers, developers, and growth strategists building digital products that matter.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    // Default Sections for Contact Us
    insertSection.run(
      'contact-us', 'hero', 'Contact Header', 1,
      JSON.stringify({
        badge: 'GET IN TOUCH',
        title: "Let's Build Something Extraordinary",
        subtitle: 'Send a message, schedule an executive strategy session, or connect with our international teams.'
      }),
      JSON.stringify({ bgMode: 'ambient-glow', glowColor: '#7e6ff0', glowIntensity: 12, glassBlur: 16, paddingY: 'spacious' })
    );

    insertSection.run(
      'contact-us', 'details', 'Direct Contacts', 2,
      JSON.stringify({
        email: 'info@thinklabdigitalsolutions.com',
        phone_in: '+91 9347580911',
        phone_au: '+61 493 305 496',
        address_in: 'Vijayawada, Andhra Pradesh, India',
        address_au: 'Mascot, Sydney, Australia'
      }),
      JSON.stringify({ bgMode: 'void-black', glowColor: '#f58327', glowIntensity: 10, glassBlur: 16, paddingY: 'normal' })
    );

    console.log('Seeded default CMS pages and sections successfully.');
  }
} catch (e) {
  console.warn('CMS seed error:', e.message);
}

console.log('Database initialized successfully at:', dbPath);

module.exports = {
  db,
  dataDir,
  uploadsDir
};
