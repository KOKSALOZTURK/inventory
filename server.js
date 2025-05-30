const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'inventory.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints for inventory
app.get('/api/inventory', (req, res) => {
  fs.readFile(DATA_FILE, (err, data) => {
    if (err) return res.json([]);
    res.json(JSON.parse(data));
  });
});

app.post('/api/inventory', (req, res) => {
  fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), err => {
    if (err) return res.status(500).send('Error saving data');
    res.sendStatus(200);
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
