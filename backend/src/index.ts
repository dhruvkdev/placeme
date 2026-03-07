import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import inviteRouter from './routes/invite.js';
import tnpRouter from './routes/tnp.js';
import studentRouter from './routes/student.js';
import recuiterRouter from './routes/recruiter.js'
import analyzeRouter from './routes/analyze.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/invite', inviteRouter);
app.use('/tnp', tnpRouter);
app.use('/student', studentRouter);
app.use('/recruiter', recuiterRouter);
app.use('/analyze', analyzeRouter);

// Health check
app.get('/health', (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
