const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/test-backend', (req, res) => {
  res.json({ status: 'ok', service: 'backend-skeleton' });
});

const port = process.env.PORT || 5001;
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
