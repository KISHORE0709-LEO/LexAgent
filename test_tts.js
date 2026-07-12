require('dotenv').config();
const text = "Hello world";
fetch('http://localhost:3000/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text })
}).then(res => {
  console.log("Status:", res.status);
  console.log("Headers:", Object.fromEntries(res.headers.entries()));
  return res.text();
}).then(text => {
  console.log("Response starts with:", text.substring(0, 50));
}).catch(console.error);
