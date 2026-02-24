import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

interface ChatParams {
  message: string;
  context: Array<{ role: 'user' | 'assistant'; content: string }>;
  model: string;
  userId: string;
}

interface ChatResult {
  content: string;
  model: string;
  tokens: number;
}

interface LyricsParams {
  theme: string;
  style: string;
  mood: string;
  verses: number;
  chorus: boolean;
}

export class AIOrchestrationService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  async chat(params: ChatParams): Promise<ChatResult> {
    logger.info('AI chat request', { model: params.model, userId: params.userId });
    try {
      if (this.openai && (params.model.startsWith('gpt') || !this.anthropic)) {
        return await this.chatWithOpenAI(params);
      } else if (this.anthropic) {
        return await this.chatWithAnthropic(params);
      }
      return { content: 'AI service not configured. Please add API keys.', model: 'none', tokens: 0 };
    } catch (error) {
      logger.error('Chat error', { error: (error as Error).message });
      throw error;
    }
  }

  private async chatWithOpenAI(params: ChatParams): Promise<ChatResult> {
    const messages = [
      { role: 'system' as const, content: 'You are DIETER AND ED AI, a professional AI music and video creation assistant. Help users create amazing music and videos.' },
      ...params.context.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: params.message },
    ];
    const response = await this.openai!.chat.completions.create({
      model: params.model || 'gpt-4',
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });
    return {
      content: response.choices[0].message.content || '',
      model: response.model,
      tokens: response.usage?.total_tokens || 0,
    };
  }

  private async chatWithAnthropic(params: ChatParams): Promise<ChatResult> {
    const response = await this.anthropic!.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: 'You are DIETER AND ED AI, a professional AI music and video creation assistant.',
      messages: [
        ...params.context.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: params.message },
      ],
    });
    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model: response.model,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  async generateLyrics(params: LyricsParams): Promise<string> {
    const prompt = `Generate ${params.style} song lyrics about "${params.theme}" with a ${params.mood} mood.
Include ${params.verses} verses${params.chorus ? ' and a chorus' : ''}.
Make it creative, emotionally resonant, and professional.`;
    const result = await this.chat({ message: prompt, context: [], model: 'gpt-4', userId: 'system' });
    return result.content;
  }

  async remixTrack(params: { trackId: string; style?: string; bpm?: number; key?: string; userId: string }): Promise<Record<string, unknown>> {
    logger.info('Remixing track', { trackId: params.trackId });
    return { trackId: params.trackId, remixId: `remix_${Date.now()}`, status: 'processing', estimatedTime: 60 };
  }

  async masterTrack(params: { trackId: string; targetLoudness: number; style: string }): Promise<Record<string, unknown>> {
    logger.info('Mastering track', { trackId: params.trackId });
    return { trackId: params.trackId, masteredId: `mastered_${Date.now()}`, status: 'processing', targetLoudness: params.targetLoudness };
  }

  async separateStems(params: { trackId: string; stems: string[] }): Promise<Record<string, unknown>> {
    logger.info('Separating stems', { trackId: params.trackId, stems: params.stems });
    const result: Record<string, string> = {};
    params.stems.forEach(stem => { result[stem] = `https://placeholder.dieterandedai.com/stems/${params.trackId}/${stem}.mp3`; });
    return { trackId: params.trackId, stems: result, status: 'completed' };
  }
}
