const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Serve index.html with PUBLIC_TEST_VAR injected
app.get('/', (req, res) => {
  let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  html = html.replace('__PUBLIC_TEST_VAR__', process.env.PUBLIC_TEST_VAR || '(not set)');
  res.send(html);
});

app.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Backend',
    secret: process.env.SECRET_TEST_VAR || '(not set)',
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
