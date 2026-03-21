import express, { Request, Response } from 'express';
import InterviewSessionModel from '../models/InterviewSession';
import verifyToken from '../middleware/auth';

const router = express.Router();

// Protected Routes
router.use(verifyToken);

// GET all sessions for a user
router.get('/', async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId || (req as any).user.id;
        const sessions = await InterviewSessionModel.findByUserId(userId);
        res.json(sessions);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// GET specific session
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const session = await InterviewSessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });

        // Ensure user owns session?
        if (session.userId != (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized access to session' });
        }

        res.json(session);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST create session
router.post('/', async (req: Request, res: Response) => {
    try {
        const sessionData = { ...req.body, userId: (req as any).user.id };
        const newSession = await InterviewSessionModel.create(sessionData);
        res.status(201).json(newSession);
    } catch (error: any) {
        console.error('Error creating session:', error);
        res.status(400).json({ message: error.message });
    }
});

// PATCH update session
router.patch('/:id', async (req: Request, res: Response) => {
    try {
        // Verify ownership first
        const session = await InterviewSessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const updatedSession = await InterviewSessionModel.update(req.params.id, req.body);
        res.json(updatedSession);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE session
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        // Verify ownership first
        const session = await InterviewSessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const result = await InterviewSessionModel.delete(req.params.id);
        if (!result) return res.status(404).json({ message: 'Session not found' });
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (error: any) {
        if (error.message === 'Not implemented') {
            res.status(501).json({ message: 'Not implemented' });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
});

// POST add turn to session
router.post('/:id/turns', async (req: Request, res: Response) => {
    try {
        // Verify ownership
        const session = await InterviewSessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const updatedSession = await InterviewSessionModel.addTurn(req.params.id, req.body);
        res.status(201).json(updatedSession);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

// PUT update session plan (Deprecated? or merged into PATCH, but keeping for compatibility)
router.put('/:id/plan', async (req: Request, res: Response) => {
    try {
        const session = await InterviewSessionModel.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) return res.status(403).json({ message: 'Unauthorized' });

        const updates: any = { plan: req.body };
        if (session.status === 'planned') {
            updates.status = 'active';
        }

        const updatedSession = await InterviewSessionModel.update(req.params.id, updates);
        res.json(updatedSession);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

export default router;
