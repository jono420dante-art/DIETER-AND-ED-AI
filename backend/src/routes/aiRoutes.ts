import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AIOrchestrationService } from '../services/AIOrchestrationService';
import { SelfPerformanceEngine } from '../ai/SelfPerformanceEngine';

const router = Router();
const aiService = new AIOrchestrationService();

// POST /api/ai/chat - AI chat endpoint
router.post('/chat', async (req: AuthRequest, res: Response) => {
  try {
    const { message, context, model } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const response = await aiService.chat({
      message,
      context: context || [],
      model: model || 'gpt-4',
      userId: req.user!.id,
    });
    return res.json({ response, model: response.model, tokens: response.tokens });
  } catch (error) {
    console.error('AI chat error:', error);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/lyrics - Generate song lyrics
router.post('/lyrics', async (req: AuthRequest, res: Response) => {
  try {
    const { theme, style, mood, verses, chorus } = req.body;
    if (!theme) return res.status(400).json({ error: 'Theme is required' });
    const lyrics = await aiService.generateLyrics({
      theme,
      style: style || 'pop',
      mood: mood || 'uplifting',
      verses: verses || 2,
      chorus: chorus !== false,
    });
    return res.json({ lyrics });
  } catch (error) {
    return res.status(500).json({ error: 'Lyrics generation failed' });
  }
});

// POST /api/ai/remix - Remix existing audio
router.post('/remix', async (req: AuthRequest, res: Response) => {
  try {
    const { trackId, style, bpm, key } = req.body;
    if (!trackId) return res.status(400).json({ error: 'Track ID is required' });
    const result = await aiService.remixTrack({ trackId, style, bpm, key, userId: req.user!.id });
    return res.json({ result, message: 'Remix created successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Remix failed' });
  }
});

// POST /api/ai/mastering - AI audio mastering
router.post('/mastering', async (req: AuthRequest, res: Response) => {
  try {
    const { trackId, targetLoudness, style } = req.body;
    if (!trackId) return res.status(400).json({ error: 'Track ID is required' });
    const result = await aiService.masterTrack({ trackId, targetLoudness: targetLoudness || -14, style: style || 'balanced' });
    return res.json({ result, message: 'Mastering completed' });
  } catch (error) {
    return res.status(500).json({ error: 'Mastering failed' });
  }
});

// GET /api/ai/performance - Get AI performance metrics
router.get('/performance', async (req: AuthRequest, res: Response) => {
  try {
    const engine = SelfPerformanceEngine.getInstance();
    const metrics = engine.getMetrics();
    return res.json({ metrics });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get metrics' });
  }
});

// POST /api/ai/stem-separation - Separate audio stems
router.post('/stem-separation', async (req: AuthRequest, res: Response) => {
  try {
    const { trackId, stems } = req.body;
    if (!trackId) return res.status(400).json({ error: 'Track ID is required' });
    const result = await aiService.separateStems({ trackId, stems: stems || ['vocals', 'drums', 'bass', 'other'] });
    return res.json({ result, message: 'Stems separated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Stem separation failed' });
  }
});

export default router;
