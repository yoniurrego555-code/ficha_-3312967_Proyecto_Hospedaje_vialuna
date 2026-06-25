const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../../public/uploads/comprobantes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const reservaId = req.params.id || 'general';
    const reservaDir = path.join(uploadDir, `reserva-${reservaId}`);
    
    if (!fs.existsSync(reservaDir)) {
      fs.mkdirSync(reservaDir, { recursive: true });
    }
    cb(null, reservaDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'comprobante-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Formato no permitido. Solo se aceptan JPG, JPEG, PNG y PDF.'));
};

const uploadComprobante = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: fileFilter
});

module.exports = uploadComprobante;
