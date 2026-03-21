import express, { Request, Response } from 'express';
import ReportModel from '../models/Report';
import verifyToken from '../middleware/auth';
import InterviewSessionModel from '../models/InterviewSession';

const router = express.Router();

router.use(verifyToken);

// GET report by sessionId
router.get('/:sessionId', async (req: Request, res: Response) => {
    try {
        // Check session ownership
        const session = await InterviewSessionModel.findById(req.params.sessionId);
        if (session && session.userId != (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const report = await ReportModel.findBySessionId(req.params.sessionId);
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        res.json(report);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// POST create/save report
router.post('/', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.body;

        // Check session ownership
        const session = await InterviewSessionModel.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        let report = await ReportModel.findBySessionId(sessionId);

        if (report) {
            // Update existing
            const updatedReport = await ReportModel.update(sessionId, req.body);
            return res.json(updatedReport);
        }

        // Create new
        const newReport = await ReportModel.create(req.body);
        res.status(201).json(newReport);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});


// DELETE report
router.delete('/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;

        // Check session ownership
        const session = await InterviewSessionModel.findById(sessionId);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId != (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const success = await ReportModel.delete(sessionId);
        if (!success) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
