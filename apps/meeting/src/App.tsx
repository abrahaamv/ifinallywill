/**
 * Meeting Rooms App with CSRF Protection (Phase 9)
 * LiveKit-powered video/audio conferencing with AI assistant
 * Features: Real-time video, screen sharing, AI chat
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CSRFProvider } from './providers/CSRFProvider';
import { LobbyPage } from './pages/LobbyPage';
import { RoomPage } from './pages/RoomPage';

export function App() {
  return (
    <CSRFProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </CSRFProvider>
  );
}
