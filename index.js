const express = require('express');

const app = express();
const port = process.env.PORT || 80;

// Middleware CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  // Habilitar "Range" e "Expose-Headers" para que ABR no se corte en Chrome
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  // Responde rápido a las peticiones OPTION ('preflight') que lanza el navegador por seguridad
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Servir public inyectando MIME
app.use(express.static('public', {
  setHeaders: (res, path) => {
    if (path.endsWith('.m4s') || path.endsWith('.mp4') || path.endsWith('.cmfv')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (path.endsWith('.vtt')) {
      res.setHeader('Content-Type', 'text/vtt');
    } else if (path.endsWith('.mpd')) {
      res.setHeader('Content-Type', 'application/dash+xml');
    } else if (path.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl'); // Lo mismo que application/x-mpegURL pero mas moderno
    }
  }
}));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});