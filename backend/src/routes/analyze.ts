import { Router, Request, Response } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const storage = multer.memoryStorage();
const upload = multer({ storage });
const router = Router();

// 1. Create a custom interface that extends the standard Express Request
interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// 2. Use MulterRequest instead of Request
router.post('/resume', upload.single('resume'), async (req: MulterRequest, res: Response): Promise<any> => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No resume file uploaded.' });
        }

        const formData = new FormData();
        formData.append('data', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL as string;
        
        const response = await axios.post(n8nWebhookUrl, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        return res.json(response.data);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error analyzing resume:', errorMessage);
        
        return res.status(500).json({ error: 'Failed to analyze resume.' });
    }
});

export default router;