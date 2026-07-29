const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'dashboard.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Data helpers ----
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('dashboard.json missing');
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---- API: get dashboard data ----
app.get('/api/dashboard', (req, res) => {
  try {
    res.json(readData());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- API: save dashboard data ----
app.post('/api/dashboard', (req, res) => {
  try {
    writeData(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- API: logo upload ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, 'logo' + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

app.post('/api/logo', upload.single('logo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const logoUrl = '/uploads/' + req.file.filename + '?t=' + Date.now();
    const data = readData();
    data.header.logoUrl = logoUrl;
    writeData(data);
    res.json({ ok: true, logoUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Studio Linear dashboard running on port ${PORT}`);
});
