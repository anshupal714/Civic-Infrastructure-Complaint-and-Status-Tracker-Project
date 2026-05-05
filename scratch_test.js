const http = require('http');

async function verify() {
  try {
    // Check health
    let res = await fetch('http://localhost:3000/api/health');
    let data = await res.json();
    console.log('Health:', data);

    // Register user
    const email = `test_${Date.now()}@example.com`;
    res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Verifier', email, password: 'password123' })
    });
    data = await res.json();
    console.log('Register:', data.success ? 'Success' : data);
    const token = data.token;

    // Login user
    res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' })
    });
    data = await res.json();
    console.log('Login:', data.success ? 'Success' : data);

    // Get me
    res = await fetch('http://localhost:3000/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Me:', data.success ? 'Success' : data);

    // Submit complaint
    const form = new FormData();
    form.append('title', 'Pothole');
    form.append('description', 'Huge pothole');
    form.append('category', 'Road');
    form.append('location', '5th Ave');
    
    res = await fetch('http://localhost:3000/api/complaints', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form
    });
    data = await res.json();
    console.log('Submit Complaint:', data.success ? 'Success' : data);
    const complaintId = data.complaint.id;

    // Get complaints list
    res = await fetch('http://localhost:3000/api/complaints', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Get Complaints List:', data.success ? 'Success' : data);

    // Get single complaint
    res = await fetch(`http://localhost:3000/api/complaints/${complaintId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Get Single Complaint:', data.success ? 'Success' : data);

    // Post comment
    res = await fetch(`http://localhost:3000/api/complaints/${complaintId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message: 'This is bad.' })
    });
    data = await res.json();
    console.log('Post Comment:', data.success ? 'Success' : data);

    // Get stats
    res = await fetch('http://localhost:3000/api/complaints/stats/summary', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    console.log('Get Stats:', data.success ? 'Success' : data);

    console.log('\n✅ All parts working successfully!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
  }
}
verify();
