const base = process.env.API_URL || 'http://localhost:3001';
const res = await fetch(base + '/api/health');
if (!res.ok) throw new Error('API offline');
console.log('OK', await res.json());
