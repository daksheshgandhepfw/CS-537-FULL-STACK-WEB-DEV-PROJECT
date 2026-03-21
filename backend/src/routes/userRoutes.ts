import express, { Request, Response } from 'express';
import UserModel from '../models/User';
import verifyToken from '../middleware/auth';

const router = express.Router();

// GET User by ID
// GET /api/users/:id
router.get('/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findById(parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});


// UPDATE User
// PUT /api/users/:id
router.put('/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        // Ensure user can only update their own account
        if (userId !== (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const updatedUser = await UserModel.update(userId, req.body);
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

// DELETE User
// DELETE /api/users/:id
router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);

        // Ensure user can only delete their own account
        if (userId !== (req as any).user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const success = await UserModel.delete(userId);
        if (!success) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
