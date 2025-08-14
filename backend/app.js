const express = require('express');
const app = express();

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/version', (_req, res) => res.json({ version: '1.0.0', service: 'tasks-api' }));
app.get('*', (req, res) => res.json({ message: 'API online', path: req.url }));

module.exports = app;
