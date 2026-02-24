import os from 'os';

interface PerformanceSnapshot {
  timestamp: number;
  cpuUsage: number;
  memoryUsedMB: number;
  memoryTotalMB: number;
  activeRequests: number;
  avgResponseTimeMs: number;
  errorRate: number;
  modelSuccessRates: Record<string, number>;
}

interface ModelMetrics {
  totalCalls: number;
  successCalls: number;
  totalTimeMs: number;
  lastUsed: number;
}

/**
 * DIETER AND ED AI - Self-Performance Engine
 * Continuously monitors backend health, adapts model routing based on
 * performance, and self-optimises for best generation success rates.
 * This is the "brain" of the backend - it learns which models perform best
 * under which conditions and adjusts routing accordingly.
 */
export class SelfPerformanceEngine {
  private snapshots: PerformanceSnapshot[] = [];
  private modelMetrics: Record<string, ModelMetrics> = {};
  private activeRequests = 0;
  private responseTimes: number[] = [];
  private errors: number[] = [];
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly MAX_SNAPSHOTS = 1000;
  private readonly MONITOR_INTERVAL_MS = 10000; // Every 10s

  startMonitoring(): void {
    console.log('[SelfPerformanceEngine] Starting performance monitoring...');
    this.monitorInterval = setInterval(() => {
      this.captureSnapshot();
      this.analyseAndAdapt();
    }, this.MONITOR_INTERVAL_MS);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    console.log('[SelfPerformanceEngine] Stopped performance monitoring.');
  }

  // Track request start
  trackRequestStart(): void {
    this.activeRequests++;
  }

  // Track request end
  trackRequestEnd(durationMs: number, success: boolean): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    this.responseTimes.push(durationMs);
    if (!success) this.errors.push(Date.now());
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) this.responseTimes.shift();
    // Keep only errors from last 60 seconds
    const cutoff = Date.now() - 60000;
    this.errors = this.errors.filter(t => t > cutoff);
  }

  // Track AI model call
  trackModelCall(model: string, success: boolean, durationMs: number): void {
    if (!this.modelMetrics[model]) {
      this.modelMetrics[model] = {
        totalCalls: 0,
        successCalls: 0,
        totalTimeMs: 0,
        lastUsed: 0,
      };
    }
    this.modelMetrics[model].totalCalls++;
    if (success) this.modelMetrics[model].successCalls++;
    this.modelMetrics[model].totalTimeMs += durationMs;
    this.modelMetrics[model].lastUsed = Date.now();
  }

  // Get the best available model for a task type
  getBestModel(taskType: 'music' | 'video' | 'image' | 'voice'): string {
    const modelsByTask: Record<string, string[]> = {
      music: ['suno-v3.5', 'eleven-music-v2', 'musicgen-large'],
      video: ['kling-3.0', 'veo-3', 'runway-gen3'],
      image: ['flux-1', 'sdxl', 'dalle-3'],
      voice: ['eleven-v3', 'eleven-v2', 'whisper'],
    };
    const candidates = modelsByTask[taskType] || [];
    // Sort by success rate, fallback to first
    return candidates
      .filter(m => this.modelMetrics[m])
      .sort((a, b) => {
        const rateA = this.modelMetrics[a].successCalls / (this.modelMetrics[a].totalCalls || 1);
        const rateB = this.modelMetrics[b].successCalls / (this.modelMetrics[b].totalCalls || 1);
        return rateB - rateA;
      })[0] || candidates[0];
  }

  // Get current performance snapshot
  getCurrentMetrics(): PerformanceSnapshot {
    return this.captureSnapshot();
  }

  // Get historical snapshots
  getHistory(): PerformanceSnapshot[] {
    return this.snapshots.slice(-50);
  }

  private captureSnapshot(): PerformanceSnapshot {
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return acc + ((total - cpu.times.idle) / total) * 100;
    }, 0) / cpus.length;

    const memTotal = os.totalmem() / (1024 * 1024);
    const memFree = os.freemem() / (1024 * 1024);
    const memUsed = memTotal - memFree;

    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    const errorRate = this.errors.length; // errors per last 60s

    const modelSuccessRates: Record<string, number> = {};
    Object.entries(this.modelMetrics).forEach(([model, metrics]) => {
      modelSuccessRates[model] = metrics.totalCalls > 0
        ? metrics.successCalls / metrics.totalCalls
        : 0;
    });

    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      cpuUsage: Math.round(cpuUsage * 10) / 10,
      memoryUsedMB: Math.round(memUsed),
      memoryTotalMB: Math.round(memTotal),
      activeRequests: this.activeRequests,
      avgResponseTimeMs: Math.round(avgResponseTime),
      errorRate,
      modelSuccessRates,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  private analyseAndAdapt(): void {
    const recent = this.snapshots.slice(-6); // Last minute
    if (recent.length < 3) return;

    const avgCPU = recent.reduce((a, s) => a + s.cpuUsage, 0) / recent.length;
    const avgErrors = recent.reduce((a, s) => a + s.errorRate, 0) / recent.length;
    const avgMemPct = recent[recent.length - 1].memoryUsedMB / recent[recent.length - 1].memoryTotalMB * 100;

    // Log performance warnings
    if (avgCPU > 85) {
      console.warn(`[SelfPerformanceEngine] HIGH CPU: ${avgCPU.toFixed(1)}% - Consider scaling`);
    }
    if (avgMemPct > 85) {
      console.warn(`[SelfPerformanceEngine] HIGH MEMORY: ${avgMemPct.toFixed(1)}% used`);
    }
    if (avgErrors > 5) {
      console.warn(`[SelfPerformanceEngine] HIGH ERROR RATE: ${avgErrors.toFixed(1)} errors/min`);
    }

    // Log model performance summary
    const lowPerformingModels = Object.entries(this.modelMetrics)
      .filter(([, m]) => m.totalCalls > 5 && m.successCalls / m.totalCalls < 0.7)
      .map(([model]) => model);

    if (lowPerformingModels.length > 0) {
      console.warn(`[SelfPerformanceEngine] LOW PERFORMING MODELS: ${lowPerformingModels.join(', ')}`);
    }
  }
}

export const selfPerformanceEngine = new SelfPerformanceEngine();
