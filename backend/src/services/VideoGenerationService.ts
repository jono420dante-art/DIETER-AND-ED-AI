import axios from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

export interface VideoGenerationParams {
  prompt: string;
  style: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  audioTrackId?: string;
  userId: string;
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  metadata: Record<string, unknown>;
}

export class VideoGenerationService {
  private readonly runwayApiUrl: string;
  private readonly stabilityApiUrl: string;
  private readonly retryAttempts = 3;

  constructor() {
    this.runwayApiUrl = process.env.RUNWAY_API_URL || 'https://api.runwayml.com/v1';
    this.stabilityApiUrl = process.env.STABILITY_API_URL || 'https://api.stability.ai/v2beta';
  }

  async generateVideo(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    logger.info('Generating video', { prompt: params.prompt, style: params.style });
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.callVideoAPI(params);
        logger.info('Video generated successfully');
        return result;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Video generation attempt ${attempt} failed`, { error: lastError.message });
        if (attempt < this.retryAttempts) await this.delay(attempt * 2000);
      }
    }
    throw new Error(`Video generation failed after ${this.retryAttempts} attempts: ${lastError?.message}`);
  }

  private async callVideoAPI(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const { prompt, style, duration, resolution, aspectRatio } = params;
    const enhancedPrompt = `${prompt}, ${style} style, ${resolution} resolution`;
    try {
      if (process.env.RUNWAY_API_KEY) {
        return await this.callRunwayAPI(enhancedPrompt, params);
      } else if (process.env.STABILITY_API_KEY) {
        return await this.callStabilityAPI(enhancedPrompt, params);
      } else {
        return this.getPlaceholderResult(params);
      }
    } catch (error) {
      throw new Error(`Video API call failed: ${(error as Error).message}`);
    }
  }

  private async callRunwayAPI(prompt: string, params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const response = await axios.post(
      `${this.runwayApiUrl}/generation`,
      { prompt, duration: params.duration, ratio: params.aspectRatio, resolution: params.resolution },
      { headers: { Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return {
      videoUrl: response.data.output,
      thumbnailUrl: response.data.thumbnail,
      duration: params.duration,
      metadata: { provider: 'runway', id: response.data.id },
    };
  }

  private async callStabilityAPI(prompt: string, params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const response = await axios.post(
      `${this.stabilityApiUrl}/video/image-to-video`,
      { prompt, duration: params.duration },
      { headers: { Authorization: `Bearer ${process.env.STABILITY_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return {
      videoUrl: response.data.video_url,
      thumbnailUrl: response.data.thumbnail_url || '',
      duration: params.duration,
      metadata: { provider: 'stability', id: response.data.id },
    };
  }

  private getPlaceholderResult(params: VideoGenerationParams): VideoGenerationResult {
    return {
      videoUrl: `https://placeholder.dieterandedai.com/video/${Date.now()}.mp4`,
      thumbnailUrl: `https://placeholder.dieterandedai.com/thumb/${Date.now()}.jpg`,
      duration: params.duration,
      metadata: { provider: 'placeholder', generatedAt: new Date().toISOString() },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
