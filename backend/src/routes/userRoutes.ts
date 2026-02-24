import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middleware/authMiddleware';

const router = Router();
const prisma = new PrismaClient();

// GET /api/users/profile - Get current user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, username: true, role: true,
        createdAt: true, lastLoginAt: true, isActive: true,
        _count: { select: { musicTracks: true, videoProjects: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const { username, bio, avatar } = req.body;
    const updateData: any = {};
    if (username) {
      const existing = await prisma.user.findFirst({ where: { username, NOT: { id: req.user!.id } } });
      if (existing) return res.status(400).json({ error: 'Username taken' });
      updateData.username = username;
    }
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: { id: true, email: true, username: true, role: true },
    });
    return res.json({ user, message: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/users/password - Change password
router.put('/password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'Password too short' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { password: hashed } });
    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

// GET /api/users/stats - Get user stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [musicCount, videoCount] = await Promise.all([
      prisma.musicTrack.count({ where: { userId: req.user!.id } }),
      prisma.videoProject.count({ where: { userId: req.user!.id } }),
    ]);
    return res.json({ stats: { musicTracks: musicCount, videoProjects: videoCount } });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
