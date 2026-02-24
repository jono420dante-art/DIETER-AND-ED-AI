import React, { useState } from 'react';
import { api } from '../utils/api';

interface MusicTrack {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
  style: string;
  createdAt: string;
}

const MusicStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('pop');
  const [tempo, setTempo] = useState(120);
  const [duration, setDuration] = useState(30);
  const [key, setKey] = useState('C');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);

  const musicStyles = ['pop', 'rock', 'jazz', 'classical', 'electronic', 'hip-hop', 'r&b', 'country', 'ambient', 'cinematic', 'lofi'];
  const musicalKeys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const instrumentOptions = ['piano', 'guitar', 'drums', 'bass', 'violin', 'synth', 'trumpet', 'saxophone'];

  const handleGenerate = async () => {
    if (!prompt.trim()) { setError('Please enter a music prompt'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post('/music/generate', { prompt, style, tempo, duration, key, instruments });
      const newTrack = response.data.track;
      setTracks(prev => [newTrack, ...prev]);
      setCurrentTrack(newTrack);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleInstrument = (instrument: string) => {
    setInstruments(prev => prev.includes(instrument) ? prev.filter(i => i !== instrument) : [...prev, instrument]);
  };

  return (
    <div className="music-studio">
      <div className="studio-header">
        <h1>DIETER AND ED AI - Music Studio</h1>
        <p>AI-Powered Music Generation combining the best of Manus.space & Arena.site</p>
      </div>

      <div className="studio-layout">
        <div className="controls-panel">
          <div className="control-group">
            <label>Music Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the music you want to create... e.g. 'An uplifting pop song about summer dreams'"
              rows={4}
              className="prompt-input"
            />
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="select-input">
                {musicStyles.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="control-group">
              <label>Key</label>
              <select value={key} onChange={e => setKey(e.target.value)} className="select-input">
                {musicalKeys.map(k => <option key={k} value={k}>{k} Major</option>)}
              </select>
            </div>
          </div>

          <div className="control-row">
            <div className="control-group">
              <label>Tempo: {tempo} BPM</label>
              <input type="range" min={60} max={200} value={tempo} onChange={e => setTempo(Number(e.target.value))} className="range-input" />
            </div>
            <div className="control-group">
              <label>Duration: {duration}s</label>
              <input type="range" min={10} max={300} value={duration} onChange={e => setDuration(Number(e.target.value))} className="range-input" />
            </div>
          </div>

          <div className="control-group">
            <label>Instruments</label>
            <div className="instrument-grid">
              {instrumentOptions.map(inst => (
                <button
                  key={inst}
                  onClick={() => toggleInstrument(inst)}
                  className={`instrument-btn ${instruments.includes(inst) ? 'active' : ''}`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className={`generate-btn ${isGenerating ? 'loading' : ''}`}
          >
            {isGenerating ? 'Generating...' : 'Generate Music'}
          </button>
        </div>

        <div className="tracks-panel">
          <h2>Generated Tracks</h2>
          {currentTrack && (
            <div className="now-playing">
              <h3>Now Playing: {currentTrack.title}</h3>
              <audio controls src={currentTrack.audioUrl} className="audio-player" />
            </div>
          )}
          <div className="tracks-list">
            {tracks.length === 0 ? (
              <div className="empty-state">
                <p>No tracks yet. Generate your first AI music!</p>
              </div>
            ) : (
              tracks.map(track => (
                <div key={track.id} className="track-item" onClick={() => setCurrentTrack(track)}>
                  <div className="track-info">
                    <span className="track-title">{track.title}</span>
                    <span className="track-meta">{track.style} | {Math.round(track.duration)}s</span>
                  </div>
                  <div className="track-actions">
                    <button onClick={e => { e.stopPropagation(); setCurrentTrack(track); }} className="play-btn">Play</button>
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

export default MusicStudio;
