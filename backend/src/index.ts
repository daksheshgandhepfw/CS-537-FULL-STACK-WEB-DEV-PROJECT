import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './db';
import sessionRoutes from './routes/sessionRoutes';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/auth';
import reportRoutes from './routes/reportRoutes';
import resumeRoutes from './routes/resumeRoutes';
import scheduledInterviewRoutes from './routes/scheduledInterviewRoutes';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app: Express = express();
const port = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.get('/', (req: Request, res: Response) => {
    res.send('AI Mock Interviewer API is running (PostgreSQL)');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/scheduled-interviews', scheduledInterviewRoutes);

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
