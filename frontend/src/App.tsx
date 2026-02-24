import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './utils/ErrorBoundary';
import { PerformanceMonitor } from './ai/PerformanceMonitor';
import { GlobalPlayer } from './components/GlobalPlayer';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ToastProvider } from './components/Toast';
import { useAppStore } from './stores/appStore';
import './App.css';

// Lazy-loaded pages for performance
const HomePage = lazy(() => import('./pages/HomePage'));
const MusicStudio = lazy(() => import('./pages/MusicStudio'));
const VideoSuite = lazy(() => import('./pages/VideoSuite'));
const Coproducer = lazy(() => import('./pages/Coproducer'));
const StudioAI = lazy(() => import('./pages/StudioAI'));
const MixerPro = lazy(() => import('./pages/MixerPro'));
const SampleUniverse = lazy(() => import('./pages/SampleUniverse'));
const Assets = lazy(() => import('./pages/Assets'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ModelLibrary = lazy(() => import('./pages/ModelLibrary'));
const AIDirector = lazy(() => import('./pages/AIDirector'));

const LoadingFallback = () => (
  <div className="loading-screen">
    <div className="loading-spinner" />
    <p>Loading DIETER AND ED AI...</p>
  </div>
);

export default function App() {
  const { sidebarOpen, currentTheme } = useAppStore();

  return (
    <ErrorBoundary>
      <PerformanceMonitor>
        <ToastProvider>
          <Router>
            <div className={`app-root theme-${currentTheme}`}>
              <Sidebar />
              <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <Navbar />
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/music-studio" element={<MusicStudio />} />
                    <Route path="/music-generator" element={<MusicStudio />} />
                    <Route path="/video-suite" element={<VideoSuite />} />
                    <Route path="/video-generator" element={<VideoSuite />} />
                    <Route path="/coproducer" element={<Coproducer />} />
                    <Route path="/studio-ai" element={<StudioAI />} />
                    <Route path="/mixer-pro" element={<MixerPro />} />
                    <Route path="/sample-universe" element={<SampleUniverse />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/marketplace" element={<Marketplace />} />
                    <Route path="/model-library" element={<ModelLibrary />} />
                    <Route path="/ai-director" element={<AIDirector />} />
                  </Routes>
                </Suspense>
              </div>
              <GlobalPlayer />
            </div>
          </Router>
        </ToastProvider>
      </PerformanceMonitor>
    </ErrorBoundary>
  );
}
