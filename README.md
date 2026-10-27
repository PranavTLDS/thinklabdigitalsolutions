# ThinkLab Digital Solutions - Full Stack Website Clone

A standalone clone of [thinklabdigitalsolutions.com](https://www.thinklabdigitalsolutions.com/) running locally with its original UI/UX, animations, typography, and Lenis smooth scrolling, powered by a **Node.js Express backend** with an embedded **SQLite database**, **interactive modals/forms**, **resume uploads**, and an **Admin Command Center**.

---

## 🚀 Quick Start

To run the entire website and backend locally:

```bash
# 1. Start the server (runs on port 3000, or auto-switches to 3001 if 3000 is busy)
npm start

# OR in development mode with live code auto-reload:
npm run dev

# If port 3000 was left open by an old background process, clear it anytime with:
npm run free-port
```

The application will be accessible at:
- 🌐 **Website**: [http://localhost:3000](http://localhost:3000)
- 🎨 **Visual CMS & Page Builder**: [http://localhost:3000/admin/studio](http://localhost:3000/admin/studio)
- 📊 **CRM Command Center**: [http://localhost:3000/admin](http://localhost:3000/admin)
- ✉️ **Contact Us**: [http://localhost:3000/contact-us](http://localhost:3000/contact-us)
- 💼 **Careers & Resumes**: [http://localhost:3000/careers](http://localhost:3000/careers)

---

## 📁 Project Structure

```
├── pages/                        # All Website Pages & HTML Templates
│   ├── index.html                # Main homepage with full Framer animations & navigation
│   ├── HomePage.html             # Synced homepage backup/alias
│   ├── about-us.html             # About Us page
│   ├── services.html             # Services page
│   ├── case-studies.html         # Case studies & projects showcase
│   ├── reviews.html              # Client reviews and testimonials
│   ├── blogs.html                # Insights and blog articles
│   ├── careers.html              # Job openings & career applications
│   └── contact-us.html           # Contact page with Direct Form, Consultation & Calendly
├── public/                       # Admin Panels & Static Client Libraries
│   ├── admin.html                # Executive-grade CRM Command Center
│   ├── admin-studio.html         # Visual In-Page CMS Studio (Live In-Page WYSIWYG)
│   └── thinklab-interactive.js   # Client suite for modals, forms, toasts & hydration shield
├── data/                         # Persistent Database & Storage Backups
│   ├── thinklab.db               # SQLite database file (leads, consultations, careers, CMS)
│   ├── backups/                  # Automatic rolling timestamped backups of saved pages
│   ├── index.original.html       # Original reference export
│   └── live_reference_index.html # Pristine live reference download
├── uploads/                      # Uploaded candidate resumes and media
├── scripts/                      # Developer & Maintenance Utilities
│   ├── test_apis.js              # Automated backend & CMS API test suite
│   ├── fix_json_snippets.js      # Structured data JSON-LD encapsulation tool
│   └── sample_resume.pdf         # Sample PDF fixture for API testing
├── db.js                         # SQLite database connection & schema (CRM + CMS)
├── server.js                     # Express backend server with API & CMS endpoints
├── package.json                  # Scripts and dependencies
└── README.md                     # Documentation
```

---

## ✨ Features & Functionalities

### 1. Frontend & Animations
- **Exact Visuals & Animations**: Preserves all Framer motion effects, spring transitions, glowing gradients, and custom typography (`League Spartan`, `Unbounded`, `Inter`).
- **Smooth Scrolling**: Lenis smooth scroll engine preserved and active.
- **Responsive Layout**: Desktop, tablet, and mobile layouts.
- **Floating Consultation Trigger**: Quick "Book Consultation" trigger on all pages that opens a sleek booking modal.

### 2. Backend & APIs
- **`POST /api/contact`**: Direct contact message submission with validation.
- **`POST /api/consultation`**: Strategy consultation slot reservation.
- **`POST /api/careers`**: Multipart job application form with document resume file uploads (`.pdf`, `.doc`, `.docx`) stored in `uploads/`.
- **`POST /api/newsletter`**: Newsletter subscription with deduplication.
- **`GET /api/admin/stats`**: Live dashboard metrics (total inquiries, open consultations, candidates, subscribers).
- **`GET /api/admin/contacts`**, `consultations`, `careers`, `newsletters`: Filtered records.
- **`PATCH /api/admin/status`**: Status update (e.g. New -> Contacted -> Closed).
- **`DELETE /api/admin/record`**: Record removal with automatic resume cleanup.
- **`GET /api/admin/export/:type`**: One-click CSV exports for all submission tables.

### 3. Admin Command Center (`/admin`)
- Real-time statistics counters and badge indicator.
- Search bar across all submission records.
- Status selector for each lead and application.
- One-click resume download for applicants.
- Instant CSV export for reporting.
