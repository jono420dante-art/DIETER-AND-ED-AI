import React, { useState } from 'react';
import { api } from '../utils/api';

interface VideoProject {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  style: string;
}

const VideoStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [duration, setDuration] = useState(15);
  const [resolution, setResolution] = useState('1080p');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<VideoProject[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoProject | null>(null);

  const videoStyles = ['cinematic', 'documentary', 'music-video', 'lyric-video', 'abstract', 'nature', 'urban', 'fantasy'];
  const resolutions = ['720p', '1080p', '4K'];
  const aspectRatios = ['16:9', '9:16', '1:1', '4:3'];

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Please enter a video prompt'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post('/video/generate', { prompt, style, duration, resolution, aspectRatio });
      const newVideo = response.data.video;
      setVideos(prev => [newVideo, ...prev]);
      setCurrentVideo(newVideo);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="video-studio">
      <div className="studio-header">
        <h1>DIETER AND ED AI - Video Studio</h1>
        <p>AI-Powered Video Generation - Create stunning music videos with AI</p>
      </div>

      <div className="studio-layout">
        <div className="controls-panel">
          <div className="control-group">
            <label>Video Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the video you want... e.g. 'A cinematic journey through neon-lit city streets at night'"
              rows={4}
              className="prompt-input"
            />
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="select-input">
                {videoStyles.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>)}
              </select>
            </div>
            <div className="control-group">
              <label>Resolution</label>
              <select value={resolution} onChange={e => setResolution(e.target.value)} className="select-input">
                {resolutions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Duration: {duration}s</label>
              <input type="range" min={5} max={120} value={duration} onChange={e => setDuration(Number(e.target.value))} className="range-input" />
            </div>
            <div className="control-group">
              <label>Aspect Ratio</label>
              <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="select-input">
                {aspectRatios.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
          >
            {isGenerating ? 'Generating Video...' : 'Generate Video'}
          </button>
        </div>

        <div className="videos-panel">
          <h2>Generated Videos</h2>
          {currentVideo && (
            <div className="now-playing">
              <h3>{currentVideo.title}</h3>
              <video controls src={currentVideo.videoUrl} poster={currentVideo.thumbnailUrl} className="video-player" />
            </div>
          )}
          <div className="videos-list">
            {videos.length === 0 ? (
              <div className="empty-state"><p>No videos yet. Generate your first AI video!</p></div>
            ) : (
              videos.map(video => (
                <div key={video.id} className="video-item" onClick={() => setCurrentVideo(video)}>
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumb" />
                  <div className="video-info">
                    <span className="video-title">{video.title}</span>
                    <span className="video-meta">{video.style} | {video.duration}s | {resolution}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoStudio;
