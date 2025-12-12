/**
 * Meeting Rooms App with CSRF Protection (Phase 9)
 * LiveKit-powered video/audio conferencing with AI assistant
 * Features: Real-time video, screen sharing, AI chat
 */

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';
import { CSRFProvider } from './providers/CSRFProvider';
import { ComingSoonProvider } from './context/ComingSoonContext';

export function App() {
  return (
    <CSRFProvider>
      <BrowserRouter>
        <ComingSoonProvider>
          <Routes>
            <Route path="/" element={<LobbyPage />} />
            <Route path="/:roomId" element={<RoomPage />} />
          </Routes>
        </ComingSoonProvider>
      </BrowserRouter>
    </CSRFProvider>
  );
}
