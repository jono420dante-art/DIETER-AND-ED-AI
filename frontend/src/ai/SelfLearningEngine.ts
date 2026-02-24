/**
 * DIETER AND ED AI - Self-Learning Engine
 * Learns from user interactions to improve prompt suggestions,
 * model selection, quality settings, and generation success rates.
 * Persists learning data in localStorage and syncs to backend.
 */

export interface UserInteraction {
  type: 'music_generate' | 'video_generate' | 'image_generate' | 'voice_swap' | 'stem_split';
  prompt: string;
  genre?: string;
  mood?: string;
  model?: string;
  quality?: string;
  duration?: number;
  success: boolean;
  generationTimeMs?: number;
  userRating?: number; // 1-5
  timestamp: number;
}

export interface LearningInsights {
  favoriteGenres: { genre: string; count: number }[];
  favoriteMoods: { mood: string; count: number }[];
  bestPerformingModels: { model: string; successRate: number; avgTime: number }[];
  preferredQuality: string;
  peakUsageHours: number[];
  successRate: number;
  totalGenerations: number;
  avgGenerationTime: number;
  promptPatterns: string[];
  suggestedSettings: Partial<UserInteraction>;
}

export class SelfLearningEngine {
  private static STORAGE_KEY = 'dieter_ed_ai_learning';
  private static MAX_HISTORY = 500;
  private interactions: UserInteraction[] = [];

  constructor() {
    this.loadFromStorage();
  }

  // Record a user interaction for learning
  recordInteraction(interaction: UserInteraction): void {
    this.interactions.push(interaction);
    // Keep only the latest MAX_HISTORY entries
    if (this.interactions.length > SelfLearningEngine.MAX_HISTORY) {
      this.interactions = this.interactions.slice(-SelfLearningEngine.MAX_HISTORY);
    }
    this.saveToStorage();
    this.syncToBackend(interaction);
  }

  // Get AI-driven insights from user history
  getInsights(): LearningInsights {
    const musicInteractions = this.interactions.filter(i => i.type === 'music_generate');
    const successfulInteractions = this.interactions.filter(i => i.success);

    // Count genre preferences
    const genreCounts: Record<string, number> = {};
    musicInteractions.forEach(i => {
      if (i.genre) genreCounts[i.genre] = (genreCounts[i.genre] || 0) + 1;
    });

    // Count mood preferences
    const moodCounts: Record<string, number> = {};
    musicInteractions.forEach(i => {
      if (i.mood) moodCounts[i.mood] = (moodCounts[i.mood] || 0) + 1;
    });

    // Model performance analysis
    const modelStats: Record<string, { success: number; total: number; totalTime: number }> = {};
    this.interactions.forEach(i => {
      if (i.model) {
        if (!modelStats[i.model]) modelStats[i.model] = { success: 0, total: 0, totalTime: 0 };
        modelStats[i.model].total++;
        if (i.success) modelStats[i.model].success++;
        if (i.generationTimeMs) modelStats[i.model].totalTime += i.generationTimeMs;
      }
    });

    // Peak usage hours
    const hourCounts: Record<number, number> = {};
    this.interactions.forEach(i => {
      const hour = new Date(i.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Quality preference
    const qualityCounts: Record<string, number> = {};
    this.interactions.forEach(i => {
      if (i.quality) qualityCounts[i.quality] = (qualityCounts[i.quality] || 0) + 1;
    });
    const preferredQuality = Object.entries(qualityCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || '320kbps';

    // Build suggested settings based on history
    const topGenre = Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const topMood = Object.entries(moodCounts).sort(([, a], [, b]) => b - a)[0]?.[0];
    const bestModel = Object.entries(modelStats)
      .map(([model, stats]) => ({
        model,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
        avgTime: stats.total > 0 ? stats.totalTime / stats.total : 0,
      }))
      .sort((a, b) => b.successRate - a.successRate)[0]?.model;

    return {
      favoriteGenres: Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      favoriteMoods: Object.entries(moodCounts)
        .map(([mood, count]) => ({ mood, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      bestPerformingModels: Object.entries(modelStats)
        .map(([model, stats]) => ({
          model,
          successRate: stats.total > 0 ? stats.success / stats.total : 0,
          avgTime: stats.total > 0 ? stats.totalTime / stats.total : 0,
        }))
        .sort((a, b) => b.successRate - a.successRate),
      preferredQuality,
      peakUsageHours: Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour)),
      successRate: this.interactions.length > 0
        ? successfulInteractions.length / this.interactions.length
        : 0,
      totalGenerations: this.interactions.length,
      avgGenerationTime: successfulInteractions.length > 0
        ? successfulInteractions.reduce((sum, i) => sum + (i.generationTimeMs || 0), 0) / successfulInteractions.length
        : 0,
      promptPatterns: this.extractPromptPatterns(),
      suggestedSettings: {
        genre: topGenre,
        mood: topMood,
        model: bestModel,
        quality: preferredQuality,
      },
    };
  }

  // Generate smart prompt suggestions based on history
  getSuggestedPrompts(genre?: string): string[] {
    const insights = this.getInsights();
    const topGenre = genre || insights.favoriteGenres[0]?.genre || 'Afro House';
    const topMood = insights.favoriteMoods[0]?.mood || 'Energetic';

    return [
      `${topMood} ${topGenre} track with driving percussion and deep bassline`,
      `${topGenre} anthem for the dancefloor, high energy ${topMood.toLowerCase()} vibes`,
      `Professional ${topGenre} production with cinematic elements and ${topMood.toLowerCase()} feel`,
      `AI-generated ${topGenre} masterpiece, 128 BPM, ${topMood.toLowerCase()} mood`,
    ];
  }

  private extractPromptPatterns(): string[] {
    const words: Record<string, number> = {};
    this.interactions
      .filter(i => i.success && i.prompt)
      .forEach(i => {
        i.prompt.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 4) {
            words[word] = (words[word] || 0) + 1;
          }
        });
      });
    return Object.entries(words)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(SelfLearningEngine.STORAGE_KEY);
      if (stored) {
        this.interactions = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[SelfLearningEngine] Failed to load from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(SelfLearningEngine.STORAGE_KEY, JSON.stringify(this.interactions));
    } catch (e) {
      console.warn('[SelfLearningEngine] Failed to save to storage:', e);
    }
  }

  private async syncToBackend(interaction: UserInteraction): Promise<void> {
    try {
      await fetch('/api/ai/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interaction),
      });
    } catch (e) {
      // Silent fail - learning data sync is non-critical
    }
  }

  // Clear all learning data
  reset(): void {
    this.interactions = [];
    localStorage.removeItem(SelfLearningEngine.STORAGE_KEY);
  }
}

// Singleton instance
export const selfLearningEngine = new SelfLearningEngine();
