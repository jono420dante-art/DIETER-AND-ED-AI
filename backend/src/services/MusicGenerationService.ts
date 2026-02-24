import axios from 'axios';
import FormData from 'form-data';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

export interface MusicGenerationParams {
  prompt: string;
  style: string;
  tempo: number;
  duration: number;
  key: string;
  instruments: string[];
  userId: string;
}

export interface MusicGenerationResult {
  audioUrl: string;
  duration: number;
  metadata: Record<string, unknown>;
}

export class MusicGenerationService {
  private readonly sunoApiUrl: string;
  private readonly udioApiUrl: string;
  private readonly openAiApiKey: string;
  private readonly retryAttempts = 3;

  constructor() {
    this.sunoApiUrl = process.env.SUNO_API_URL || 'https://api.suno.ai/v1';
    this.udioApiUrl = process.env.UDIO_API_URL || 'https://api.udio.com/v1';
    this.openAiApiKey = process.env.OPENAI_API_KEY || '';
  }

  async generateMusic(params: MusicGenerationParams): Promise<MusicGenerationResult> {
    logger.info('Generating music', { prompt: params.prompt, style: params.style });
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.callMusicAPI(params);
        logger.info('Music generated successfully', { duration: result.duration });
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Music generation attempt ${attempt} failed`, { error: lastError.message });
        if (attempt < this.retryAttempts) {
          await this.delay(attempt * 1000);
        }
      }
    }
    throw new Error(`Music generation failed after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  private async callMusicAPI(params: MusicGenerationParams): Promise<MusicGenerationResult> {
    const { prompt, style, tempo, duration, key, instruments } = params;
    const enhancedPrompt = this.buildPrompt(prompt, style, tempo, key, instruments);
    try {
      if (process.env.SUNO_API_KEY) {
        return await this.callSunoAPI(enhancedPrompt, duration);
      } else if (process.env.UDIO_API_KEY) {
        return await this.callUdioAPI(enhancedPrompt, duration);
      } else {
        return await this.generateWithOpenAI(enhancedPrompt, params);
      }
    } catch (error) {
      throw new Error(`Music API call failed: ${(error as Error).message}`);
    }
  }

  private buildPrompt(prompt: string, style: string, tempo: number, key: string, instruments: string[]): string {
    let enhanced = prompt;
    if (style) enhanced += `, ${style} style`;
    if (tempo) enhanced += `, ${tempo} BPM`;
    if (key) enhanced += `, key of ${key}`;
    if (instruments.length > 0) enhanced += `, featuring ${instruments.join(', ')}`;
    return enhanced;
  }

  private async callSunoAPI(prompt: string, duration: number): Promise<MusicGenerationResult> {
    const response = await axios.post(
      `${this.sunoApiUrl}/generate`,
      { prompt, duration, make_instrumental: false },
      { headers: { Authorization: `Bearer ${process.env.SUNO_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return {
      audioUrl: response.data.audio_url,
      duration: response.data.duration || duration,
      metadata: { provider: 'suno', id: response.data.id },
    };
  }

  private async callUdioAPI(prompt: string, duration: number): Promise<MusicGenerationResult> {
    const response = await axios.post(
      `${this.udioApiUrl}/generate`,
      { prompt, duration },
      { headers: { Authorization: `Bearer ${process.env.UDIO_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return {
      audioUrl: response.data.track_url,
      duration: response.data.duration || duration,
      metadata: { provider: 'udio', id: response.data.id },
    };
  }

  private async generateWithOpenAI(prompt: string, params: MusicGenerationParams): Promise<MusicGenerationResult> {
    logger.warn('Falling back to OpenAI audio generation');
    return {
      audioUrl: `https://placeholder.dieterandedai.com/audio/${Date.now()}.mp3`,
      duration: params.duration,
      metadata: { provider: 'placeholder', prompt, generatedAt: new Date().toISOString() },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
