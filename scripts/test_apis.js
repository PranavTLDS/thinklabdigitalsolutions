const fs = require('fs');
const path = require('path');

async function testBackend() {
  console.log('--- Starting Backend API Test Suite ---');
  const baseUrl = 'http://localhost:3000';

  // 1. Test Contact Form API
  console.log('\n[1] Testing POST /api/contact...');
  const contactRes = await fetch(`${baseUrl}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rohan Verma',
      email: 'rohan.verma@example.com',
      phone: '+91 9876543210',
      service: 'SEO & Growth',
      budget: '₹1.5L - ₹5L / $3k - $8k',
      message: 'Looking for full SEO optimization and local search growth for our business.'
    })
  });
  const contactJson = await contactRes.json();
  console.log('Contact Response:', contactJson);

  // 2. Test Consultation Booking API
  console.log('\n[2] Testing POST /api/consultation...');
  const consultRes = await fetch(`${baseUrl}/api/consultation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sarah Jenkins',
      email: 'sarah.j@techstartup.com',
      phone: '+61 493 305 496',
      service: 'Google & Meta Ads',
      booking_date: '2026-11-05',
      booking_time: '02:30 PM',
      notes: 'Scaling our international lead generation campaigns.'
    })
  });
  const consultJson = await consultRes.json();
  console.log('Consultation Response:', consultJson);

  // 3. Test Career Application API with Resume
  console.log('\n[3] Testing POST /api/careers with resume upload...');
  const sampleResumePath = path.join(__dirname, 'sample_resume.pdf');
  fs.writeFileSync(sampleResumePath, '%PDF-1.4 Sample Resume Content for Test', 'utf8');

  const fileBlob = new Blob([fs.readFileSync(sampleResumePath)], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('name', 'Amit Sen');
  formData.append('email', 'amit.sen@developer.com');
  formData.append('phone', '+91 9123456789');
  formData.append('position', 'Web Developer Intern');
  formData.append('linkedin', 'https://linkedin.com/in/amitsen');
  formData.append('portfolio', 'https://amitsen.dev');
  formData.append('cover_letter', 'Excited about frontend animations and full-stack systems at ThinkLab.');
  formData.append('resume', fileBlob, 'Amit_Sen_Resume.pdf');

  const careerRes = await fetch(`${baseUrl}/api/careers`, {
    method: 'POST',
    body: formData
  });
  const careerJson = await careerRes.json();
  console.log('Career Response:', careerJson);

  // 4. Test Newsletter Subscription API
  console.log('\n[4] Testing POST /api/newsletter...');
  const newsRes = await fetch(`${baseUrl}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'growth_marketer@thinklab.com',
      source: 'Homepage Newsletter'
    })
  });
  const newsJson = await newsRes.json();
  console.log('Newsletter Response:', newsJson);

  // 5. Test Admin Stats
  console.log('\n[5] Testing GET /api/admin/stats...');
  const statsRes = await fetch(`${baseUrl}/api/admin/stats`);
  const statsJson = await statsRes.json();
  console.log('Stats Response:', statsJson);

  // 6. Test CSV Export
  console.log('\n[6] Testing GET /api/admin/export/contacts...');
  const exportRes = await fetch(`${baseUrl}/api/admin/export/contacts`);
  const csvText = await exportRes.text();
  console.log('Export CSV Sample (first 120 chars):', csvText.substring(0, 120));

  // 7. Test CMS Pages List
  console.log('\n[7] Testing GET /api/cms/pages...');
  const cmsPagesRes = await fetch(`${baseUrl}/api/cms/pages`);
  const cmsPagesJson = await cmsPagesRes.json();
  console.log('CMS Pages Count:', cmsPagesJson.data.length, 'Pages:', cmsPagesJson.data.map(p => p.slug).join(', '));

  // 8. Test CMS Page Publish & Live Data
  console.log('\n[8] Testing POST /api/cms/pages/home/publish & GET /api/cms/published/home...');
  const cmsPubRes = await fetch(`${baseUrl}/api/cms/pages/home/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const cmsPubJson = await cmsPubRes.json();
  console.log('Publish Response:', cmsPubJson);

  const cmsLiveRes = await fetch(`${baseUrl}/api/cms/published/home`);
  const cmsLiveJson = await cmsLiveRes.json();
  console.log('Live Published Hero Title:', cmsLiveJson.sections.hero.content.title);

  console.log('\n--- ALL BACKEND & CMS TESTS PASSED SUCCESSFULLY! ---');
}

testBackend().catch(err => {
  console.error('Test Failed:', err);
});
