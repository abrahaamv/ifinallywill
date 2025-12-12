/**
 * SchedulePage - Meeting scheduling and calendar management
 * For meet.visualkit.live integration
 */

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Link2,
  Plus,
  Users,
  Video,
} from 'lucide-react';
import { useState } from 'react';

interface ScheduledMeeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  roomId: string;
  agentId: string;
  agentName: string;
  attendees: string[];
  status: 'upcoming' | 'in-progress' | 'completed' | 'cancelled';
  meetUrl: string;
}

const mockMeetings: ScheduledMeeting[] = [
  {
    id: 'meet-1',
    title: 'Product Demo with Acme Corp',
    date: '2024-12-10',
    time: '10:00 AM',
    duration: 30,
    roomId: 'demo-acme-001',
    agentId: 'agent-1',
    agentName: 'Sales Assistant',
    attendees: ['john@acme.com', 'sarah@acme.com'],
    status: 'upcoming',
    meetUrl: 'https://meet.visualkit.live/demo-acme-001',
  },
  {
    id: 'meet-2',
    title: 'Technical Support Session',
    date: '2024-12-10',
    time: '2:00 PM',
    duration: 45,
    roomId: 'support-002',
    agentId: 'agent-2',
    agentName: 'Support Agent',
    attendees: ['mike@client.com'],
    status: 'upcoming',
    meetUrl: 'https://meet.visualkit.live/support-002',
  },
  {
    id: 'meet-3',
    title: 'Onboarding Call',
    date: '2024-12-11',
    time: '11:00 AM',
    duration: 60,
    roomId: 'onboard-003',
    agentId: 'agent-3',
    agentName: 'Onboarding Agent',
    attendees: ['new@customer.com'],
    status: 'upcoming',
    meetUrl: 'https://meet.visualkit.live/onboard-003',
  },
];

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function SchedulePage() {
  const [meetings] = useState<ScheduledMeeting[]>(mockMeetings);
  const [currentDate] = useState(new Date());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (meetUrl: string, meetId: string) => {
    navigator.clipboard.writeText(meetUrl);
    setCopiedId(meetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const todayMeetings = meetings.filter((m) => m.date === '2024-12-10');
  const upcomingMeetings = meetings.filter((m) => m.date !== '2024-12-10');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-600">
            Manage your meeting schedule and invites
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="text-lg font-semibold">
                  {currentDate.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Today
              </Button>
              <Button variant="outline" size="sm">
                Week
              </Button>
              <Button variant="outline" size="sm">
                Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Meetings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Today&apos;s Meetings
              </CardTitle>
              <CardDescription>
                {todayMeetings.length} meetings scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {todayMeetings.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p>No meetings scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayMeetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onCopyLink={handleCopyLink}
                      copiedId={copiedId}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Meetings</span>
                  <span className="font-semibold">{meetings.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Duration</span>
                  <span className="font-semibold">
                    {meetings.reduce((acc, m) => acc + m.duration, 0)} min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unique Attendees</span>
                  <span className="font-semibold">
                    {new Set(meetings.flatMap((m) => m.attendees)).size}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {meeting.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {meeting.date} at {meeting.time}
                      </p>
                    </div>
                    <Badge className={statusColors[meeting.status]}>
                      {meeting.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MeetingCard({
  meeting,
  onCopyLink,
  copiedId,
}: {
  meeting: ScheduledMeeting;
  onCopyLink: (url: string, id: string) => void;
  copiedId: string | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
            <Badge className={statusColors[meeting.status]}>
              {meeting.status}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {meeting.time} ({meeting.duration} min)
            </span>
            <span className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              {meeting.agentName}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {meeting.attendees.length} attendees
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCopyLink(meeting.meetUrl, meeting.id)}
          >
            {copiedId === meeting.id ? (
              'Copied!'
            ) : (
              <>
                <Link2 className="mr-1 h-3 w-3" />
                Copy Link
              </>
            )}
          </Button>
          <Button size="sm">
            <ExternalLink className="mr-1 h-3 w-3" />
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}
