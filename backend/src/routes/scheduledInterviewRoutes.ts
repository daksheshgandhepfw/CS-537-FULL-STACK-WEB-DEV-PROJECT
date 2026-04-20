import express, { Request, Response } from 'express';
import ScheduledInterviewModel from '../models/ScheduledInterviewModel';
import verifyToken from '../middleware/auth';

const router = express.Router();

// Protected Routes
router.use(verifyToken);

// GET all scheduled interviews for a user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId || (req as any).user.id;
        const sessions = await ScheduledInterviewModel.findByUserId(userId);
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET specific scheduled interview
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const session = await ScheduledInterviewModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Interview not found' });

        if (session.userId != (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized access to interview' });
        }

        res.json(session);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST create scheduled interview
router.post('/', async (req: Request, res: Response) => {
    try {
        const data = { ...req.body, userId: (req as any).user.id };
        const newSession = await ScheduledInterviewModel.create(data);
        res.status(201).json(newSession);
    } catch (error: any) {
        console.error('Error creating scheduled interview:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE scheduled interview
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        // Verify ownership first
        const session = await ScheduledInterviewModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Interview not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const result = await ScheduledInterviewModel.delete(req.params.id);
        if (!result) return res.status(404).json({ message: 'Interview not found' });
        res.status(200).json({ message: 'Interview deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET readiness report
router.get('/:id/readiness', async (req: Request, res: Response) => {
    try {
        // Verify ownership first
        const session = await ScheduledInterviewModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Interview not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const report = await ScheduledInterviewModel.getReadinessReport(req.params.id);
        res.json(report || { message: 'No mock interviews recorded yet' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET sessions for a scheduled interview
router.get('/:id/sessions', async (req: Request, res: Response) => {
    try {
        // Verify ownership first
        const session = await ScheduledInterviewModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Interview not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const sessions = await ScheduledInterviewModel.getSessions(req.params.id);
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
