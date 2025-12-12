/**
 * Meeting Rooms Page - Placeholder
 * Video meeting functionality coming soon with Janus Gateway integration
 */

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui';
import { Activity, Clock, Users, Video } from 'lucide-react';

export function RoomsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meeting Rooms</h1>
          <p className="mt-2 text-muted-foreground">
            Real-time WebRTC collaboration with screen sharing excellence
          </p>
        </div>
        <Button disabled>
          <Video className="mr-2 h-4 w-4" />
          Create Room
        </Button>
      </div>

      {/* Stats Cards - Placeholder */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Active Rooms</p>
              <Video className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">—</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Participants</p>
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">—</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Screen Sharing</p>
              <Activity className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">—</p>
          </CardContent>
        </Card>

        <Card className="border shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
              <Clock className="h-5 w-5 text-primary-600" />
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Card */}
      <Card className="border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Meetings Coming Soon
          </CardTitle>
          <CardDescription>
            WebRTC video conferencing with AI-powered assistance is under development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-6 text-6xl">🎥</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Janus Gateway Integration
            </h2>
            <p className="text-muted-foreground max-w-md">
              We're building a new WebRTC solution for video meetings with screen sharing,
              AI assistance, and real-time collaboration features.
            </p>
            <div className="mt-6 flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">HD</div>
                <div className="text-xs text-muted-foreground">Video Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">AI</div>
                <div className="text-xs text-muted-foreground">Powered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">E2E</div>
                <div className="text-xs text-muted-foreground">Encrypted</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
