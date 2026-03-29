const express = require('express');

// MIME
/*
express.static.mime.define({
  'text/vtt': ['vtt'],
  'video/mp4': ['mp4'],
  'video/webm': ['webm']
});
*/

const app = express();
const port = process.env.PORT || 80;

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});