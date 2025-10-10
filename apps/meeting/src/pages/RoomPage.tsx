/**
 * Room Page
 * LiveKit meeting room wrapper
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MeetingRoom } from './MeetingRoom';

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to lobby if no room ID
    if (!roomId) {
      navigate('/');
      return;
    }

    // Check if user came from lobby
    if (!sessionStorage.getItem('displayName')) {
      navigate('/');
    }
  }, [roomId, navigate]);

  // Use MeetingRoom component for LiveKit integration
  return <MeetingRoom />;
}
