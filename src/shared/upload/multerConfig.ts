import fs from 'fs';
import path from 'path';
import multer from 'multer';

const CARPETA_ESCUDOS = path.join(process.cwd(), 'uploads', 'escudos');
fs.mkdirSync(CARPETA_ESCUDOS, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, CARPETA_ESCUDOS);
  },
  filename: (req, _file, cb) => {
    const equipoId = req.params.id;
    cb(null, `escudo-${equipoId}-${Date.now()}.jpg`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (file.mimetype === 'image/jpeg') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos .jpg o .jpeg'));
  }
}

export const uploadEscudoMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('escudo');
