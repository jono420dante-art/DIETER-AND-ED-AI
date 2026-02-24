import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { AuthRequest } from '../middleware/authMiddleware';
import { MusicGenerationService } from '../services/MusicGenerationService';

const router = Router();
const prisma = new PrismaClient();
const musicService = new MusicGenerationService();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// GET /api/music - Get user's music tracks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const tracks = await prisma.musicTrack.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ tracks, count: tracks.length });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// POST /api/music/generate - Generate AI music
router.post('/generate', async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, style, tempo, duration, key, instruments } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const result = await musicService.generateMusic({
      prompt,
      style: style || 'pop',
      tempo: tempo || 120,
      duration: Math.min(duration || 30, 300),
      key: key || 'C',
      instruments: instruments || [],
      userId: req.user!.id,
    });
    const track = await prisma.musicTrack.create({
      data: {
        userId: req.user!.id,
        title: prompt.slice(0, 100),
        prompt,
        style,
        audioUrl: result.audioUrl,
        duration: result.duration,
        status: 'COMPLETED',
        metadata: result.metadata as any,
      },
    });
    return res.status(201).json({ track, message: 'Music generated successfully' });
  } catch (error) {
    console.error('Music generation error:', error);
    return res.status(500).json({ error: 'Music generation failed' });
  }
});

// GET /api/music/:id - Get a specific track
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const track = await prisma.musicTrack.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    return res.json({ track });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// DELETE /api/music/:id - Delete a track
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const track = await prisma.musicTrack.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!track) return res.status(404).json({ error: 'Track not found' });
    await prisma.musicTrack.delete({ where: { id: req.params.id } });
    return res.json({ message: 'Track deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete track' });
  }
});

// GET /api/music/styles - Get available music styles
router.get('/meta/styles', async (req: AuthRequest, res: Response) => {
  const styles = ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'r&b', 'country', 'folk', 'ambient', 'cinematic', 'lofi'];
  return res.json({ styles });
});

export default router;
