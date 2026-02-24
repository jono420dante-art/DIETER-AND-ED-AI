import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { VideoGenerationService } from '../services/VideoGenerationService';

const router = Router();
const prisma = new PrismaClient();
const videoService = new VideoGenerationService();

// GET /api/video - Get user's videos
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const videos = await prisma.videoProject.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return res.json({ videos, count: videos.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// POST /api/video/generate - Generate AI video
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, style, duration, resolution, audioTrackId, aspectRatio } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const result = await videoService.generateVideo({
      prompt,
      style: style || 'cinematic',
      duration: Math.min(duration || 15, 120),
      resolution: resolution || '1080p',
      aspectRatio: aspectRatio || '16:9',
      audioTrackId,
      userId: req.user!.id,
    });
    const video = await prisma.videoProject.create({
      data: {
        userId: req.user!.id,
        title: prompt.slice(0, 100),
        prompt,
        style,
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        resolution,
        status: 'COMPLETED',
      },
    });
    return res.status(201).json({ video, message: 'Video generated successfully' });
  } catch (error) {
    console.error('Video generation error:', error);
    return res.status(500).json({ error: 'Video generation failed' });
  }
});

// GET /api/video/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const video = await prisma.videoProject.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    return res.json({ video });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// DELETE /api/video/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const video = await prisma.videoProject.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    await prisma.videoProject.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete video' });
  }
});

export default router;
