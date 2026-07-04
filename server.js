const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies
app.use(express.json());

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  extensions: ['html'],
}));

// ── API routes (load the same Vercel handlers) ────────────────────────────────
const chatHandler     = require('./api/chat.js');
const loginHandler    = require('./api/login.js');
const usersHandler    = require('./api/users.js');
const settingsHandler = require('./api/settings.js');

// Wrap Vercel-style handler (req, res) in Express route
function wrap(handler) {
  return (req, res) => handler(req, res);
}

app.post('/api/chat',  wrap(chatHandler));
app.post('/api/login', wrap(loginHandler));
app.get('/api/users',    wrap(usersHandler));
app.post('/api/users',   wrap(usersHandler));
app.delete('/api/users', wrap(usersHandler));
app.patch('/api/users',  wrap(usersHandler));
app.get('/api/settings',  wrap(settingsHandler));
app.post('/api/settings', wrap(settingsHandler));
app.options('/api/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.status(200).end();
});

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Plataforma Jurídico-Mineral rodando na porta ${PORT}`);
});
