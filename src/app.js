const express = require('express');
const http = require('http');
const path = require('path');
const { router, setupWebSocket } = require('./routes/api');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use('/api', router);

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../public')));

// Route pour servir le fichier HTML principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Configurer les WebSockets
setupWebSocket(server);

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
