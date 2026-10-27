import { Hono } from 'hono';

const app = new Hono();

const PAGE_FILES = {
  home: 'index.html',
  'about-us': 'about-us.html',
  services: 'services.html',
  'case-studies': 'case-studies.html',
  reviews: 'reviews.html',
  blogs: 'blogs.html',
  careers: 'careers.html',
  'contact-us': 'contact-us.html'
};
const ROUTE_TO_FILE = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/HomePage.html': 'HomePage.html',
  '/about-us': 'about-us.html',
  '/services': 'services.html',
  '/case-studies': 'case-studies.html',
  '/reviews': 'reviews.html',
  '/blogs': 'blogs.html',
  '/careers': 'careers.html',
  '/contact-us': 'contact-us.html'
};
const TABLES = { contact: 'contacts', consultation: 'consultations', career: 'careers', newsletter: 'newsletters' };
const EXPORTS = { contacts: 'contacts', consultations: 'consultations', careers: 'careers', newsletters: 'newsletters' };

const DOC_EXT = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
// KV values max out at 25MB; keep uploads modest.
const MAX_UPLOAD = 10 * 1024 * 1024;

const ok = (c, extra = {}) => c.json({ success: true, ...extra });
const fail = (c, status, error) => c.json({ success: false, error }, status);
const ext = (name) => (name.match(/\.[^.]+$/) || [''])[0].toLowerCase();
const str = (v) => (typeof v === 'string' ? v.trim() : '');

async function readBody(c) {
  const type = c.req.header('content-type') || '';
  if (type.includes('application/json')) return await c.req.json();
  return await c.req.parseBody();
}

// Stores an uploaded File in KV and returns its generated name.
async function saveFile(env, file, allowed, { prefix = '', isPublic }) {
  const e = ext(file.name);
  if (!allowed.includes(e)) {
    throw new Error(`Only these file types are permitted: ${allowed.join(', ')}`);
  }
  if (file.size > MAX_UPLOAD) throw new Error('File is too large (max 10MB).');
  const safe = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const name = `${prefix}${safe}-${Date.now()}-${Math.round(Math.random() * 1e9)}${e}`;
  await env.STORE.put(`file:${name}`, await file.arrayBuffer(), {
    metadata: { type: file.type || 'application/octet-stream', original: file.name, isPublic }
  });
  return name;
}

// ---------------------------------------------------------------
// Public forms
// ---------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.post('/api/contact', async (c) => {
  try {
    const b = await readBody(c);
    const name = str(b.name), email = str(b.email), message = str(b.message);
    if (!name || !email || !message) return fail(c, 400, 'Name, email, and message are required.');
    if (!EMAIL_RE.test(email)) return fail(c, 400, 'Please enter a valid email address.');
    const ip = c.req.header('cf-connecting-ip') || '';
    const r = await c.env.DB.prepare(
      'INSERT INTO contacts (name, email, phone, service, budget, message, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(name, email, str(b.phone), b.service || 'General Inquiry', b.budget || '', message, ip).run();
    return ok(c, {
      message: 'Thank you! Your message has been sent successfully. Our team will contact you within 24 hours.',
      id: r.meta.last_row_id
    });
  } catch (err) {
    console.error('contact', err);
    return fail(c, 500, 'Internal server error processing contact.');
  }
});

app.post('/api/consultation', async (c) => {
  try {
    const b = await readBody(c);
    const name = str(b.name), email = str(b.email);
    if (!name || !email || !b.booking_date) return fail(c, 400, 'Name, email, and preferred date are required.');
    const r = await c.env.DB.prepare(
      'INSERT INTO consultations (name, email, phone, service, booking_date, booking_time, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(name, email, str(b.phone), b.service || 'Strategy Consultation', b.booking_date, b.booking_time || '10:00 AM', str(b.notes)).run();
    return ok(c, {
      message: 'Consultation session booked successfully! We have reserved your slot and sent confirmation details.',
      id: r.meta.last_row_id
    });
  } catch (err) {
    console.error('consultation', err);
    return fail(c, 500, 'Internal server error processing booking.');
  }
});

app.post('/api/careers', async (c) => {
  try {
    const b = await readBody(c);
    const name = str(b.name), email = str(b.email), phone = str(b.phone), position = str(b.position);
    if (!name || !email || !phone || !position) {
      return fail(c, 400, 'Name, email, phone, and target position are required.');
    }
    let filename = null, original = null;
    if (b.resume instanceof File && b.resume.size > 0) {
      filename = await saveFile(c.env, b.resume, DOC_EXT, { prefix: 'resume-', isPublic: false });
      original = b.resume.name;
    }
    const r = await c.env.DB.prepare(
      `INSERT INTO careers (name, email, phone, position, portfolio, linkedin, cover_letter, resume_filename, resume_original_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(name, email, phone, position, str(b.portfolio), str(b.linkedin), str(b.cover_letter), filename, original).run();
    return ok(c, {
      message: `Your application for ${position} has been received! Our recruitment team will review your qualifications.`,
      id: r.meta.last_row_id
    });
  } catch (err) {
    console.error('careers', err);
    return fail(c, 500, err.message || 'Error processing career application.');
  }
});

app.post('/api/newsletter', async (c) => {
  try {
    const b = await readBody(c);
    const email = str(b.email).toLowerCase();
    if (!email) return fail(c, 400, 'Email address is required.');
    if (!EMAIL_RE.test(email)) return fail(c, 400, 'Please enter a valid email address.');
    try {
      await c.env.DB.prepare('INSERT INTO newsletters (email, source) VALUES (?, ?)')
        .bind(email, b.source || 'Website Footer').run();
      return ok(c, { message: 'Thank you for subscribing to ThinkLab Digital Insights!' });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) {
        return ok(c, { message: 'You are already subscribed to our newsletter! Thank you.' });
      }
      throw e;
    }
  } catch (err) {
    console.error('newsletter', err);
    return fail(c, 500, 'Error processing newsletter subscription.');
  }
});

// ---------------------------------------------------------------
// Admin: stats, leads, status, delete, export
// ---------------------------------------------------------------
app.get('/api/admin/stats', async (c) => {
  const n = async (sql) => (await c.env.DB.prepare(sql).first()).count;
  return ok(c, {
    stats: {
      totalLeads: await n('SELECT count(*) as count FROM contacts'),
      newLeads: await n("SELECT count(*) as count FROM contacts WHERE status = 'New'"),
      totalConsultations: await n('SELECT count(*) as count FROM consultations'),
      totalCareers: await n('SELECT count(*) as count FROM careers'),
      newCareers: await n("SELECT count(*) as count FROM careers WHERE status = 'New'"),
      totalNewsletters: await n('SELECT count(*) as count FROM newsletters'),
      totalCaseStudies: await n('SELECT count(*) as count FROM case_studies')
    }
  });
});

for (const t of Object.values(TABLES)) {
  app.get(`/api/admin/${t}`, async (c) => {
    const { results } = await c.env.DB.prepare(`SELECT * FROM ${t} ORDER BY created_at DESC`).all();
    return ok(c, { data: results });
  });
}

app.patch('/api/admin/status', async (c) => {
  const { type, id, status } = await c.req.json();
  const table = TABLES[type];
  if (!table || !id || !status) return fail(c, 400, 'Invalid parameters.');
  await c.env.DB.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).bind(status, id).run();
  return ok(c, { message: `Status updated to ${status}.` });
});

app.delete('/api/admin/record', async (c) => {
  const { type, id } = await c.req.json();
  const table = TABLES[type];
  if (!table || !id) return fail(c, 400, 'Invalid parameters.');
  if (type === 'career') {
    const row = await c.env.DB.prepare('SELECT resume_filename FROM careers WHERE id = ?').bind(id).first();
    if (row?.resume_filename) await c.env.STORE.delete(`file:${row.resume_filename}`);
  }
  await c.env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
  return ok(c, { message: 'Record deleted successfully.' });
});

app.get('/api/admin/export/:type', async (c) => {
  const table = EXPORTS[c.req.param('type')];
  if (!table) return c.text('Not found', 404);
  const { results } = await c.env.DB.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC`).all();
  if (!results.length) return c.text('No data');
  const headers = Object.keys(results[0]);
  const csv = [
    headers.join(','),
    ...results.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename=thinklab-${c.req.param('type')}-${Date.now()}.csv`
    }
  });
});

// ---------------------------------------------------------------
// Case studies
// ---------------------------------------------------------------
app.get('/api/case-studies', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM case_studies ORDER BY order_idx ASC, id ASC').all();
  return ok(c, { data: results });
});

async function caseStudyImage(c, b, fallback) {
  if (b.image instanceof File && b.image.size > 0) {
    return `/uploads/${await saveFile(c.env, b.image, IMG_EXT, { isPublic: true })}`;
  }
  const url = str(b.image_url);
  return url || fallback;
}

app.post('/api/admin/case-studies', async (c) => {
  try {
    const b = await readBody(c);
    const title = str(b.title);
    if (!title) return fail(c, 400, 'Project Title is required.');
    const r = await c.env.DB.prepare(
      `INSERT INTO case_studies (title, tag, year, description, image_url, metric1_val, metric1_lbl, metric2_val, metric2_lbl, link_url, order_idx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      title, str(b.tag) || 'CASE STUDY', str(b.year) || '2026', str(b.description),
      await caseStudyImage(c, b, ''),
      str(b.metric1_val), str(b.metric1_lbl), str(b.metric2_val), str(b.metric2_lbl),
      str(b.link_url) || '/case-studies', parseInt(b.order_idx) || 0
    ).run();
    const data = await c.env.DB.prepare('SELECT * FROM case_studies WHERE id = ?').bind(r.meta.last_row_id).first();
    return ok(c, { message: 'Case study added successfully!', data });
  } catch (err) {
    return fail(c, 500, err.message);
  }
});

app.put('/api/admin/case-studies/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const b = await readBody(c);
    const ex = await c.env.DB.prepare('SELECT * FROM case_studies WHERE id = ?').bind(id).first();
    if (!ex) return fail(c, 404, 'Case study not found.');
    const pick = (k) => (b[k] !== undefined ? str(b[k]) : ex[k]);
    await c.env.DB.prepare(
      `UPDATE case_studies SET title = ?, tag = ?, year = ?, description = ?, image_url = ?,
       metric1_val = ?, metric1_lbl = ?, metric2_val = ?, metric2_lbl = ?, link_url = ?, order_idx = ? WHERE id = ?`
    ).bind(
      str(b.title) || ex.title, pick('tag'), pick('year'), pick('description'),
      await caseStudyImage(c, b, ex.image_url),
      pick('metric1_val'), pick('metric1_lbl'), pick('metric2_val'), pick('metric2_lbl'), pick('link_url'),
      b.order_idx !== undefined ? parseInt(b.order_idx) || 0 : ex.order_idx, id
    ).run();
    const data = await c.env.DB.prepare('SELECT * FROM case_studies WHERE id = ?').bind(id).first();
    return ok(c, { message: 'Case study updated successfully!', data });
  } catch (err) {
    return fail(c, 500, err.message);
  }
});

app.delete('/api/admin/case-studies/:id', async (c) => {
  const id = c.req.param('id');
  const ex = await c.env.DB.prepare('SELECT id FROM case_studies WHERE id = ?').bind(id).first();
  if (!ex) return fail(c, 404, 'Case study not found.');
  await c.env.DB.prepare('DELETE FROM case_studies WHERE id = ?').bind(id).run();
  return ok(c, { message: 'Case study deleted successfully.' });
});

// ---------------------------------------------------------------
// CMS
// ---------------------------------------------------------------
const json = (v, fallback) => (typeof v === 'object' ? JSON.stringify(v) : v || fallback);
const parse = (s) => { try { return JSON.parse(s); } catch { return {}; } };

app.get('/api/cms/pages', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT p.*, COUNT(s.id) as section_count FROM cms_pages p
     LEFT JOIN cms_sections s ON p.slug = s.page_slug GROUP BY p.slug ORDER BY p.slug ASC`
  ).all();
  return ok(c, { data: results });
});

app.get('/api/cms/pages/:slug', async (c) => {
  const slug = c.req.param('slug');
  const page = await c.env.DB.prepare('SELECT * FROM cms_pages WHERE slug = ?').bind(slug).first();
  if (!page) return fail(c, 404, 'Page not found');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM cms_sections WHERE page_slug = ? ORDER BY display_order ASC, id ASC'
  ).bind(slug).all();
  return ok(c, {
    page,
    sections: results.map((s) => ({ ...s, content: parse(s.content_json), styles: parse(s.styles_json) }))
  });
});

app.put('/api/cms/pages/:slug/section', async (c) => {
  const slug = c.req.param('slug');
  const { section_key, section_name, is_visible, content, styles } = await c.req.json();
  if (!section_key) return fail(c, 400, 'section_key is required');
  const vis = is_visible !== undefined ? (is_visible ? 1 : 0) : 1;
  const ex = await c.env.DB.prepare('SELECT id FROM cms_sections WHERE page_slug = ? AND section_key = ?')
    .bind(slug, section_key).first();
  if (ex) {
    await c.env.DB.prepare(
      'UPDATE cms_sections SET content_json = ?, styles_json = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(json(content, '{}'), json(styles, '{}'), vis, ex.id).run();
  } else {
    const m = await c.env.DB.prepare('SELECT MAX(display_order) as m FROM cms_sections WHERE page_slug = ?').bind(slug).first();
    await c.env.DB.prepare(
      `INSERT INTO cms_sections (page_slug, section_key, section_name, display_order, is_visible, content_json, styles_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(slug, section_key, section_name || section_key, (m?.m || 0) + 1, vis, json(content, '{}'), json(styles, '{}')).run();
  }
  await c.env.DB.prepare("UPDATE cms_pages SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE slug = ?").bind(slug).run();
  return ok(c, { message: 'Section updated successfully (Draft saved).' });
});

app.post('/api/cms/pages/:slug/publish', async (c) => {
  const slug = c.req.param('slug');
  const { sections } = await c.req.json().catch(() => ({}));
  if (Array.isArray(sections)) {
    const stmts = [];
    for (const [idx, sec] of sections.entries()) {
      const vis = sec.is_visible !== undefined ? (sec.is_visible ? 1 : 0) : 1;
      const content = typeof sec.content === 'object' ? JSON.stringify(sec.content) : sec.content_json || '{}';
      const styles = typeof sec.styles === 'object' ? JSON.stringify(sec.styles) : sec.styles_json || '{}';
      stmts.push(c.env.DB.prepare(
        `INSERT INTO cms_sections (page_slug, section_key, section_name, display_order, is_visible, content_json, styles_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(page_slug, section_key) DO UPDATE SET section_name = excluded.section_name,
           display_order = excluded.display_order, is_visible = excluded.is_visible,
           content_json = excluded.content_json, styles_json = excluded.styles_json, updated_at = CURRENT_TIMESTAMP`
      ).bind(slug, sec.section_key, sec.section_name || sec.section_key, idx + 1, vis, content, styles));
    }
    if (stmts.length) await c.env.DB.batch(stmts);
  }
  await c.env.DB.prepare("UPDATE cms_pages SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slug = ?").bind(slug).run();
  return ok(c, { message: `Page "${slug}" published successfully! All changes are now live.` });
});

app.get('/api/cms/published/:slug', async (c) => {
  const slug = c.req.param('slug');
  const page = await c.env.DB.prepare('SELECT * FROM cms_pages WHERE slug = ?').bind(slug).first();
  if (!page) return fail(c, 404, 'Page not found');
  const { results } = await c.env.DB.prepare(
    `SELECT section_key, section_name, display_order, content_json, styles_json FROM cms_sections
     WHERE page_slug = ? AND is_visible = 1 ORDER BY display_order ASC`
  ).bind(slug).all();
  const sections = {};
  for (const s of results) {
    sections[s.section_key] = { name: s.section_name, order: s.display_order, content: parse(s.content_json), styles: parse(s.styles_json) };
  }
  c.header('Cache-Control', 'no-cache');
  return ok(c, { slug, page, sections });
});

app.post('/api/cms/media/upload', async (c) => {
  try {
    const b = await readBody(c);
    if (!(b.image instanceof File) || !b.image.size) return fail(c, 400, 'No image uploaded');
    const name = await saveFile(c.env, b.image, IMG_EXT, { prefix: 'cms_', isPublic: true });
    return ok(c, { message: 'Image uploaded successfully', url: `/uploads/${name}`, filename: name });
  } catch (err) {
    return fail(c, 500, err.message);
  }
});

// Save an edited page. The HTML lives in KV and overrides the bundled static file.
app.post('/api/cms/save-page', async (c) => {
  try {
    const { slug, html } = await c.req.json();
    if (!slug || !html) return fail(c, 400, 'slug and html are required.');
    const filename = PAGE_FILES[slug];
    if (!filename) return fail(c, 400, `Invalid page slug: ${slug}`);

    const tooShort = (h) => (filename === 'index.html' ? h.length < 50000 || !h.includes('id="main"') : h.length < 1000);
    if (tooShort(html)) return fail(c, 400, 'Incomplete page content detected. Publishing aborted to protect page layout.');

    let out = html.replace(/<script[^>]*bestfreecdn[^>]*><\/script>/gi, '');
    out = out.replace(/(<!-- Snippet: ([a-zA-Z0-9]+) -->)([\s\S]*?)(<!-- SnippetEnd: \2 -->)/g, (m, open, id, body, close) => {
      const t = body.trim();
      return t.startsWith('{') && !t.includes('<script')
        ? `${open}\n<script type="application/ld+json">\n${t}\n</script>\n${close}`
        : m;
    });
    const edits = out.match(/<script id="tl-active-edits">[\s\S]*?<\/script>/);
    if (edits) {
      out = out.replace(edits[0], '').replace('<head>', `<head>\n  ${edits[0]}`);
    }
    if (!out.includes('thinklab-interactive.js')) {
      out = out.replace('</body>', '<script src="/scripts/thinklab-interactive.js" defer></script>\n</body>');
    }
    if (tooShort(out)) return fail(c, 500, 'Fatal error: Attempted to save truncated page.');

    // Back up the version currently live (override or bundled), keep the last 5.
    const current = (await c.env.STORE.get(`page:${filename}`)) ?? (await (await c.env.ASSETS.fetch(new URL(`/${filename}`, c.req.url))).text());
    await c.env.STORE.put(`backup:${filename}:${Date.now()}`, current);
    const { keys } = await c.env.STORE.list({ prefix: `backup:${filename}:` });
    for (const k of keys.sort((a, b) => b.name.localeCompare(a.name)).slice(5)) await c.env.STORE.delete(k.name);

    await c.env.STORE.put(`page:${filename}`, out);
    if (filename === 'index.html') await c.env.STORE.put('page:HomePage.html', out);
    await c.env.DB.prepare("UPDATE cms_pages SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE slug = ?").bind(slug).run();
    return ok(c, { message: `Page "${filename}" published successfully! Changes are live on the website.` });
  } catch (err) {
    return fail(c, 500, err.message);
  }
});

// ---------------------------------------------------------------
// Uploaded files
// ---------------------------------------------------------------
app.get('/uploads/:name', async (c) => {
  const { value, metadata } = await c.env.STORE.getWithMetadata(`file:${c.req.param('name')}`, 'arrayBuffer');
  if (!value) return c.text('Not found', 404);
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${(metadata?.original || 'file').replace(/"/g, '')}"`,
      'X-Content-Type-Options': 'nosniff'
    }
  });
});

// ---------------------------------------------------------------
// Pages and static assets
// ---------------------------------------------------------------
const noCache = (res) => {
  const r = new Response(res.body, res);
  r.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  return r;
};

const ADMIN_PAGES = { '/admin': 'admin/admin.html', '/admin/studio': 'admin/admin-studio.html', '/admin/pages': 'admin/admin-studio.html' };

app.get('*', async (c) => {
  const path = c.req.path;
  let file = ROUTE_TO_FILE[path];
  if (file) {
    const html = await c.env.STORE.get(`page:${file}`);
    if (html !== null) {
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache, no-store, must-revalidate' } });
    }
  } else {
    file = ADMIN_PAGES[path] || (path.startsWith('/admin/pages/') ? 'admin/admin-studio.html' : null);
  }
  let target = file ? `/${file}` : path.replace(/^\/public\//, '/scripts/');
  const res = await c.env.ASSETS.fetch(new URL(target, c.req.url));
  if (res.status === 404) return c.text('Page not found', 404);
  return /\.(html|js)$/.test(target) ? noCache(res) : res;
});

export default app;
