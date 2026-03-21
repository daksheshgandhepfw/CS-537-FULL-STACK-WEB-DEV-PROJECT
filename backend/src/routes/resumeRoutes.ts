import express, { Request, Response } from 'express';
import multer from 'multer';
// import pdf from 'pdf-parse'; // TS issue
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

const router = express.Router();

// Configure Multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/parse', upload.single('resume'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const buffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        let text = '';

        if (mimeType === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return res.status(400).json({ message: 'Unsupported file type. Please upload PDF or DOCX.' });
        }

        // Basic cleaning
        text = text.trim();

        res.json({ text });
    } catch (error: any) {
        console.error('Resume parsing error:', error);
        res.status(500).json({ message: 'Failed to parse resume', error: error.message });
    }
});

export default router;
