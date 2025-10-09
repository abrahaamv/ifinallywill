/**
 * Room Page
 * LiveKit meeting room wrapper
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MeetingRoom } from './MeetingRoom';

export function RoomPage() {
  const { roomId: _roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from lobby
    if (!sessionStorage.getItem('displayName')) {
      navigate('/');
    }
  }, [navigate]);

  // Use MeetingRoom component for LiveKit integration
  return <MeetingRoom />;
}
