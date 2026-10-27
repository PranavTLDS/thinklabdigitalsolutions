const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, uploadsDir } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${safeName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only document files (.pdf, .doc, .docx, .rtf, .txt) are permitted!'));
    }
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (.jpg, .jpeg, .png, .webp, .svg, .gif) are permitted!'));
    }
  }
});

// Serve uploaded files securely (for admin download)
app.use('/uploads', express.static(uploadsDir));

// Serve scripts with no-cache headers for instant updates
app.use('/scripts', express.static(path.join(__dirname, 'scripts'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// Backward compatibility alias: /public maps to /scripts so existing tags continue working seamlessly
app.use('/public', express.static(path.join(__dirname, 'scripts'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Contact Form Submission
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';

    const stmt = db.prepare(`
      INSERT INTO contacts (name, email, phone, service, budget, message, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name.trim(), email.trim(), phone?.trim() || '', service || 'General Inquiry', budget || '', message.trim(), ip);

    console.log(`[Lead] New contact lead from ${name} (${email}) - ID #${info.lastInsertRowid}`);

    res.json({
      success: true,
      message: 'Thank you! Your message has been sent successfully. Our team will contact you within 24 hours.',
      id: info.lastInsertRowid
    });
  } catch (err) {
    console.error('Error saving contact:', err);
    res.status(500).json({ success: false, error: 'Internal server error processing contact.' });
  }
});

// 2. Consultation Booking
app.post('/api/consultation', (req, res) => {
  try {
    const { name, email, phone, service, booking_date, booking_time, notes } = req.body;

    if (!name || !email || !booking_date) {
      return res.status(400).json({ success: false, error: 'Name, email, and preferred date are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO consultations (name, email, phone, service, booking_date, booking_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name.trim(), email.trim(), phone?.trim() || '', service || 'Strategy Consultation', booking_date, booking_time || '10:00 AM', notes?.trim() || '');

    console.log(`[Booking] New consultation booked by ${name} (${email}) on ${booking_date} at ${booking_time || '10:00 AM'}`);

    res.json({
      success: true,
      message: 'Consultation session booked successfully! We have reserved your slot and sent confirmation details.',
      id: info.lastInsertRowid
    });
  } catch (err) {
    console.error('Error booking consultation:', err);
    res.status(500).json({ success: false, error: 'Internal server error processing booking.' });
  }
});

// 3. Career Application Submission (with Resume Upload)
app.post('/api/careers', upload.single('resume'), (req, res) => {
  try {
    const { name, email, phone, position, portfolio, linkedin, cover_letter } = req.body;

    if (!name || !email || !phone || !position) {
      return res.status(400).json({ success: false, error: 'Name, email, phone, and target position are required.' });
    }

    const resume_filename = req.file ? req.file.filename : null;
    const resume_original_name = req.file ? req.file.originalname : null;

    const stmt = db.prepare(`
      INSERT INTO careers (name, email, phone, position, portfolio, linkedin, cover_letter, resume_filename, resume_original_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name.trim(),
      email.trim(),
      phone.trim(),
      position.trim(),
      portfolio?.trim() || '',
      linkedin?.trim() || '',
      cover_letter?.trim() || '',
      resume_filename,
      resume_original_name
    );

    console.log(`[Career] New application from ${name} for ${position} (Resume: ${resume_original_name || 'None'})`);

    res.json({
      success: true,
      message: `Your application for ${position} has been received! Our recruitment team will review your qualifications.`,
      id: info.lastInsertRowid
    });
  } catch (err) {
    console.error('Error saving career application:', err);
    res.status(500).json({ success: false, error: err.message || 'Error processing career application.' });
  }
});

// 4. Newsletter Subscription
app.post('/api/newsletter', (req, res) => {
  try {
    const { email, source } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    try {
      const stmt = db.prepare(`INSERT INTO newsletters (email, source) VALUES (?, ?)`);
      stmt.run(email.trim().toLowerCase(), source || 'Website Footer');
      res.json({ success: true, message: 'Thank you for subscribing to ThinkLab Digital Insights!' });
    } catch (dbErr) {
      if (dbErr.message && dbErr.message.includes('UNIQUE constraint failed')) {
        return res.json({ success: true, message: 'You are already subscribed to our newsletter! Thank you.' });
      }
      throw dbErr;
    }
  } catch (err) {
    console.error('Error saving newsletter:', err);
    res.status(500).json({ success: false, error: 'Error processing newsletter subscription.' });
  }
});

// -------------------------------------------------------------
// Admin Endpoints
// -------------------------------------------------------------

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  try {
    const contactsCount = db.prepare(`SELECT count(*) as count FROM contacts`).get().count;
    const consultationsCount = db.prepare(`SELECT count(*) as count FROM consultations`).get().count;
    const careersCount = db.prepare(`SELECT count(*) as count FROM careers`).get().count;
    const newslettersCount = db.prepare(`SELECT count(*) as count FROM newsletters`).get().count;
    const caseStudiesCount = db.prepare(`SELECT count(*) as count FROM case_studies`).get().count;

    const newContacts = db.prepare(`SELECT count(*) as count FROM contacts WHERE status = 'New'`).get().count;
    const newCareers = db.prepare(`SELECT count(*) as count FROM careers WHERE status = 'New'`).get().count;

    res.json({
      success: true,
      stats: {
        totalLeads: contactsCount,
        newLeads: newContacts,
        totalConsultations: consultationsCount,
        totalCareers: careersCount,
        newCareers,
        totalNewsletters: newslettersCount,
        totalCaseStudies: caseStudiesCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Case Studies APIs (Public & Admin)
// -------------------------------------------------------------

// 1. Get All Case Studies (Public for Website Cards & Admin)
app.get('/api/case-studies', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM case_studies ORDER BY order_idx ASC, id ASC`).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Create Case Study (Admin)
app.post('/api/admin/case-studies', imageUpload.single('image'), (req, res) => {
  try {
    const {
      title,
      tag,
      year,
      description,
      image_url,
      metric1_val,
      metric1_lbl,
      metric2_val,
      metric2_lbl,
      link_url,
      order_idx
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, error: 'Project Title is required.' });
    }

    // Determine image URL: either uploaded file or URL input
    let finalImageUrl = image_url?.trim() || '';
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    }

    const stmt = db.prepare(`
      INSERT INTO case_studies (
        title, tag, year, description, image_url,
        metric1_val, metric1_lbl, metric2_val, metric2_lbl,
        link_url, order_idx
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      title.trim(),
      tag?.trim() || 'CASE STUDY',
      year?.trim() || '2026',
      description?.trim() || '',
      finalImageUrl,
      metric1_val?.trim() || '',
      metric1_lbl?.trim() || '',
      metric2_val?.trim() || '',
      metric2_lbl?.trim() || '',
      link_url?.trim() || '/case-studies',
      parseInt(order_idx) || 0
    );

    const created = db.prepare(`SELECT * FROM case_studies WHERE id = ?`).get(info.lastInsertRowid);
    console.log(`[Case Study] Created new project "${title}" ID #${info.lastInsertRowid}`);

    res.json({ success: true, message: 'Case study added successfully!', data: created });
  } catch (err) {
    console.error('Error creating case study:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update Case Study (Admin)
app.put('/api/admin/case-studies/:id', imageUpload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      tag,
      year,
      description,
      image_url,
      metric1_val,
      metric1_lbl,
      metric2_val,
      metric2_lbl,
      link_url,
      order_idx
    } = req.body;

    const existing = db.prepare(`SELECT * FROM case_studies WHERE id = ?`).get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Case study not found.' });
    }

    let finalImageUrl = existing.image_url;
    if (req.file) {
      finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (image_url !== undefined && image_url.trim() !== '') {
      finalImageUrl = image_url.trim();
    }

    const stmt = db.prepare(`
      UPDATE case_studies SET
        title = ?,
        tag = ?,
        year = ?,
        description = ?,
        image_url = ?,
        metric1_val = ?,
        metric1_lbl = ?,
        metric2_val = ?,
        metric2_lbl = ?,
        link_url = ?,
        order_idx = ?
      WHERE id = ?
    `);

    stmt.run(
      title?.trim() || existing.title,
      tag !== undefined ? tag.trim() : existing.tag,
      year !== undefined ? year.trim() : existing.year,
      description !== undefined ? description.trim() : existing.description,
      finalImageUrl,
      metric1_val !== undefined ? metric1_val.trim() : existing.metric1_val,
      metric1_lbl !== undefined ? metric1_lbl.trim() : existing.metric1_lbl,
      metric2_val !== undefined ? metric2_val.trim() : existing.metric2_val,
      metric2_lbl !== undefined ? metric2_lbl.trim() : existing.metric2_lbl,
      link_url !== undefined ? link_url.trim() : existing.link_url,
      order_idx !== undefined ? parseInt(order_idx) : existing.order_idx,
      id
    );

    const updated = db.prepare(`SELECT * FROM case_studies WHERE id = ?`).get(id);
    console.log(`[Case Study] Updated project ID #${id}`);

    res.json({ success: true, message: 'Case study updated successfully!', data: updated });
  } catch (err) {
    console.error('Error updating case study:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Delete Case Study (Admin)
app.delete('/api/admin/case-studies/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare(`SELECT * FROM case_studies WHERE id = ?`).get(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Case study not found.' });
    }

    db.prepare(`DELETE FROM case_studies WHERE id = ?`).run(id);
    console.log(`[Case Study] Deleted project ID #${id}`);

    res.json({ success: true, message: 'Case study deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Contact Leads
app.get('/api/admin/contacts', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM contacts ORDER BY created_at DESC`).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Consultations
app.get('/api/admin/consultations', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM consultations ORDER BY created_at DESC`).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Career Applications
app.get('/api/admin/careers', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM careers ORDER BY created_at DESC`).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Newsletters
app.get('/api/admin/newsletters', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM newsletters ORDER BY created_at DESC`).all();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update Status
app.patch('/api/admin/status', (req, res) => {
  try {
    const { type, id, status } = req.body;
    const tableMap = {
      contact: 'contacts',
      consultation: 'consultations',
      career: 'careers',
      newsletter: 'newsletters'
    };
    const table = tableMap[type];
    if (!table || !id || !status) {
      return res.status(400).json({ success: false, error: 'Invalid parameters.' });
    }

    db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
    res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete Record
app.delete('/api/admin/record', (req, res) => {
  try {
    const { type, id } = req.body;
    const tableMap = {
      contact: 'contacts',
      consultation: 'consultations',
      career: 'careers',
      newsletter: 'newsletters'
    };
    const table = tableMap[type];
    if (!table || !id) {
      return res.status(400).json({ success: false, error: 'Invalid parameters.' });
    }

    // If career, delete file too
    if (type === 'career') {
      const career = db.prepare(`SELECT resume_filename FROM careers WHERE id = ?`).get(id);
      if (career && career.resume_filename) {
        const filePath = path.join(uploadsDir, career.resume_filename);
        if (fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) {}
        }
      }
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export CSV
app.get('/api/admin/export/:type', (req, res) => {
  try {
    const { type } = req.params;
    const tableMap = {
      contacts: 'contacts',
      consultations: 'consultations',
      careers: 'careers',
      newsletters: 'newsletters'
    };
    const table = tableMap[type];
    if (!table) return res.status(404).send('Not found');

    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
    if (rows.length === 0) return res.send('No data');

    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=thinklab-${type}-${Date.now()}.csv`);
    res.send(csvContent);
  } catch (err) {
    res.status(500).send('Error generating CSV');
  }
});

// -------------------------------------------------------------
// CMS / Visual Page Builder Endpoints
// -------------------------------------------------------------

const cmsUploadsDir = path.join(uploadsDir, 'cms');
if (!fs.existsSync(cmsUploadsDir)) fs.mkdirSync(cmsUploadsDir, { recursive: true });

const cmsStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cmsUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 24);
    cb(null, `cms_${safeName}_${Date.now()}${ext}`);
  }
});
const cmsUpload = multer({
  storage: cmsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 1. Get all CMS pages
app.get('/api/cms/pages', (req, res) => {
  try {
    const pages = db.prepare(`
      SELECT p.*, COUNT(s.id) as section_count 
      FROM cms_pages p 
      LEFT JOIN cms_sections s ON p.slug = s.page_slug 
      GROUP BY p.slug 
      ORDER BY p.slug ASC
    `).all();
    res.json({ success: true, data: pages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get single page with all sections
app.get('/api/cms/pages/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const page = db.prepare('SELECT * FROM cms_pages WHERE slug = ?').get(slug);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const sections = db.prepare(`
      SELECT * FROM cms_sections 
      WHERE page_slug = ? 
      ORDER BY display_order ASC, id ASC
    `).all(slug);

    const parsedSections = sections.map(s => {
      let content = {};
      let styles = {};
      try { content = JSON.parse(s.content_json); } catch (e) {}
      try { styles = JSON.parse(s.styles_json); } catch (e) {}
      return {
        ...s,
        content,
        styles
      };
    });

    res.json({
      success: true,
      page,
      sections: parsedSections
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Update single section (Save Draft)
app.put('/api/cms/pages/:slug/section', (req, res) => {
  try {
    const { slug } = req.params;
    const { section_key, section_name, is_visible, content, styles } = req.body;

    if (!section_key) {
      return res.status(400).json({ success: false, error: 'section_key is required' });
    }

    const existing = db.prepare('SELECT id FROM cms_sections WHERE page_slug = ? AND section_key = ?').get(slug, section_key);

    const contentStr = typeof content === 'object' ? JSON.stringify(content) : content || '{}';
    const stylesStr = typeof styles === 'object' ? JSON.stringify(styles) : styles || '{}';
    const vis = is_visible !== undefined ? (is_visible ? 1 : 0) : 1;

    if (existing) {
      db.prepare(`
        UPDATE cms_sections 
        SET content_json = ?, styles_json = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(contentStr, stylesStr, vis, existing.id);
    } else {
      const maxOrder = db.prepare('SELECT MAX(display_order) as m FROM cms_sections WHERE page_slug = ?').get(slug);
      const nextOrder = (maxOrder && maxOrder.m ? maxOrder.m : 0) + 1;
      db.prepare(`
        INSERT INTO cms_sections (page_slug, section_key, section_name, display_order, is_visible, content_json, styles_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(slug, section_key, section_name || section_key, nextOrder, vis, contentStr, stylesStr);
    }

    db.prepare(`UPDATE cms_pages SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE slug = ?`).run(slug);

    res.json({ success: true, message: 'Section updated successfully (Draft saved).' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Publish All Changes for a Page
app.post('/api/cms/pages/:slug/publish', (req, res) => {
  try {
    const { slug } = req.params;
    const { sections } = req.body; // optional payload with full sections array to commit all at once

    if (Array.isArray(sections)) {
      sections.forEach((sec, idx) => {
        const contentStr = typeof sec.content === 'object' ? JSON.stringify(sec.content) : sec.content_json || '{}';
        const stylesStr = typeof sec.styles === 'object' ? JSON.stringify(sec.styles) : sec.styles_json || '{}';
        const vis = sec.is_visible !== undefined ? (sec.is_visible ? 1 : 0) : 1;

        const exists = db.prepare('SELECT id FROM cms_sections WHERE page_slug = ? AND section_key = ?').get(slug, sec.section_key);
        if (exists) {
          db.prepare(`
            UPDATE cms_sections 
            SET section_name = ?, display_order = ?, is_visible = ?, content_json = ?, styles_json = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(sec.section_name || sec.section_key, idx + 1, vis, contentStr, stylesStr, exists.id);
        } else {
          db.prepare(`
            INSERT INTO cms_sections (page_slug, section_key, section_name, display_order, is_visible, content_json, styles_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(slug, sec.section_key, sec.section_name || sec.section_key, idx + 1, vis, contentStr, stylesStr);
        }
      });
    }

    db.prepare(`UPDATE cms_pages SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slug = ?`).run(slug);
    console.log(`[CMS] Page "${slug}" published successfully.`);

    res.json({ success: true, message: `Page "${slug}" published successfully! All changes are now live.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Public Published Data Endpoint (for Client Hydration)
app.get('/api/cms/published/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    const page = db.prepare('SELECT * FROM cms_pages WHERE slug = ?').get(slug);
    if (!page) {
      return res.status(404).json({ success: false, error: 'Page not found' });
    }

    const sections = db.prepare(`
      SELECT section_key, section_name, display_order, is_visible, content_json, styles_json 
      FROM cms_sections 
      WHERE page_slug = ? AND is_visible = 1 
      ORDER BY display_order ASC
    `).all(slug);

    const sectionMap = {};
    sections.forEach(s => {
      let content = {};
      let styles = {};
      try { content = JSON.parse(s.content_json); } catch (e) {}
      try { styles = JSON.parse(s.styles_json); } catch (e) {}
      sectionMap[s.section_key] = {
        name: s.section_name,
        order: s.display_order,
        content,
        styles
      };
    });

    res.setHeader('Cache-Control', 'no-cache');
    res.json({
      success: true,
      slug,
      page,
      sections: sectionMap
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. CMS Media Upload
app.post('/api/cms/media/upload', cmsUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image uploaded' });
    }
    const fileUrl = `/uploads/cms/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Save and Publish Exact HTML Page Directly
app.post('/api/cms/save-page', (req, res) => {
  try {
    const { slug, html } = req.body;
    if (!slug || !html) {
      return res.status(400).json({ success: false, error: 'slug and html are required.' });
    }

    const fileMap = {
      'home': 'index.html',
      'about-us': 'about-us.html',
      'services': 'services.html',
      'case-studies': 'case-studies.html',
      'reviews': 'reviews.html',
      'blogs': 'blogs.html',
      'careers': 'careers.html',
      'contact-us': 'contact-us.html'
    };

    const filename = fileMap[slug];
    if (!filename) {
      return res.status(400).json({ success: false, error: `Invalid page slug: ${slug}` });
    }

    const pagesDir = path.join(__dirname, 'pages');
    const targetPath = path.join(pagesDir, filename);
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ success: false, error: `File not found in pages: ${filename}` });
    }

    // Create backups folder if needed
    const backupDir = path.join(__dirname, 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    // Backup current version before overwrite
    const backupPath = path.join(backupDir, `${filename}.${Date.now()}.bak`);
    fs.copyFileSync(targetPath, backupPath);

    // Keep only last 5 backups per file to keep folder organized
    try {
      const allBackups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(filename))
        .sort()
        .reverse();
      if (allBackups.length > 5) {
        allBackups.slice(5).forEach(old => {
          try { fs.unlinkSync(path.join(backupDir, old)); } catch (e) {}
        });
      }
    } catch (e) {}

    // Integrity verification: ensure page is complete and has not been truncated
    if (filename === 'index.html') {
      if (html.length < 50000 || !html.includes('id="main"')) {
        return res.status(400).json({ success: false, error: 'Incomplete homepage content detected. Publishing aborted to protect page layout.' });
      }
    } else {
      if (html.length < 1000) {
        return res.status(400).json({ success: false, error: 'Incomplete page content detected. Publishing aborted.' });
      }
    }

    // Sanitize HTML: Remove tracker scripts if present
    let sanitizedHtml = html;
    sanitizedHtml = sanitizedHtml.replace(/<script[^>]*bestfreecdn[^>]*><\/script>/gi, '');

    // Ensure all JSON-LD snippets are wrapped inside <script type="application/ld+json">
    sanitizedHtml = sanitizedHtml.replace(/(<!-- Snippet: ([a-zA-Z0-9]+) -->)([\s\S]*?)(<!-- SnippetEnd: \2 -->)/g, (match, openTag, id, content, closeTag) => {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') && !trimmed.includes('<script')) {
        return `${openTag}\n<script type="application/ld+json">\n${trimmed}\n</script>\n${closeTag}`;
      }
      return match;
    });

    // Move <script id="tl-active-edits"> into <head> so edits are available before any DOM/hydration script runs
    const editScriptMatch = sanitizedHtml.match(/<script id="tl-active-edits">[\s\S]*?<\/script>/);
    if (editScriptMatch) {
      sanitizedHtml = sanitizedHtml.replace(editScriptMatch[0], '');
      sanitizedHtml = sanitizedHtml.replace('<head>', `<head>\n  ${editScriptMatch[0]}`);
    }

    if (!sanitizedHtml.includes('thinklab-interactive.js')) {
      sanitizedHtml = sanitizedHtml.replace('</body>', '<script src="/scripts/thinklab-interactive.js" defer></script>\n</body>');
    }

    // Final safety verification: NEVER write a corrupted file
    if (filename === 'index.html') {
      if (sanitizedHtml.length < 50000 || !sanitizedHtml.includes('id="main"')) {
        console.error('[CMS] Fatal: Attempted to save truncated homepage. Aborting write.');
        return res.status(500).json({ success: false, error: 'Fatal error: Attempted to save truncated homepage.' });
      }
    } else {
      if (sanitizedHtml.length < 1000) {
        console.error('[CMS] Fatal: Attempted to save truncated page. Aborting write.');
        return res.status(500).json({ success: false, error: 'Fatal error: Attempted to save truncated page.' });
      }
    }

    // Overwrite page with new published HTML
    fs.writeFileSync(targetPath, sanitizedHtml, 'utf8');

    // Keep HomePage.html synchronized if saving index.html
    if (filename === 'index.html') {
      const homePagePath = path.join(pagesDir, 'HomePage.html');
      try { fs.writeFileSync(homePagePath, sanitizedHtml, 'utf8'); } catch (e) {}
    }

    // Update SQLite status
    try {
      db.prepare(`UPDATE cms_pages SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slug = ?`).run(slug);
    } catch (e) {}

    console.log(`[CMS] Page "${filename}" published and saved directly to pages/${filename}.`);

    res.json({
      success: true,
      message: `Page "${filename}" published successfully! Changes are live on the website.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Page Routes (Serving HTML from pages/ and admin/)
// -------------------------------------------------------------

const pagesDir = path.join(__dirname, 'pages');
const adminDir = path.join(__dirname, 'admin');

const servePage = (relPath) => (req, res) => {
  const filePath = relPath.startsWith('admin/')
    ? path.join(__dirname, relPath)
    : path.join(pagesDir, relPath);

  if (fs.existsSync(filePath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } else {
    res.status(404).send('Page not found');
  }
};

app.get('/', servePage('index.html'));
app.get('/index.html', servePage('index.html'));
app.get('/HomePage.html', servePage('HomePage.html'));
app.get('/about-us', servePage('about-us.html'));
app.get('/services', servePage('services.html'));
app.get('/case-studies', servePage('case-studies.html'));
app.get('/reviews', servePage('reviews.html'));
app.get('/blogs', servePage('blogs.html'));
app.get('/careers', servePage('careers.html'));
app.get('/contact-us', servePage('contact-us.html'));
app.get('/admin', servePage('admin/admin.html'));
app.get('/admin/studio', servePage('admin/admin-studio.html'));
app.get('/admin/pages', servePage('admin/admin-studio.html'));
app.get('/admin/pages/:page', servePage('admin/admin-studio.html'));

// Static fallbacks for pages, admin, and root assets
app.use(express.static(pagesDir));
app.use('/admin', express.static(adminDir));
app.use(express.static(__dirname));

// Start server with automatic port retry if busy
function startServer(portToTry) {
  const server = app.listen(portToTry, () => {
    console.log(`====================================================`);
    console.log(`🚀 ThinkLab Digital Solutions Server running!`);
    console.log(`🌐 Website URL:      http://localhost:${portToTry}`);
    console.log(`📊 Admin Dashboard:  http://localhost:${portToTry}/admin`);
    console.log(`✉️  Contact Form:    http://localhost:${portToTry}/contact-us`);
    console.log(`💼 Careers Portal:  http://localhost:${portToTry}/careers`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️  Port ${portToTry} is already in use. Retrying on port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(Number(PORT));

