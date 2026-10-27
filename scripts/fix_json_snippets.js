const fs = require('fs');
const path = require('path');

const pages = [
  'index.html',
  'about-us.html',
  'services.html',
  'case-studies.html',
  'reviews.html',
  'blogs.html',
  'careers.html',
  'contact-us.html'
];

pages.forEach(filename => {
  let filePath = path.join(__dirname, '..', 'pages', filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', filename);
  }
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf8');

  // Match each snippet block and if content is raw JSON (starts with {), wrap in <script type="application/ld+json">
  html = html.replace(/(<!-- Snippet: ([a-zA-Z0-9]+) -->)([\s\S]*?)(<!-- SnippetEnd: \2 -->)/g, (match, openTag, id, content, closeTag) => {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') && !trimmed.includes('<script')) {
      return `${openTag}\n<script type="application/ld+json">\n${trimmed}\n</script>\n${closeTag}`;
    }
    return match;
  });

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Fixed JSON-LD in ${filename}`);
});
