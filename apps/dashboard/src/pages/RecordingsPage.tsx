/**
 * RecordingsPage - Meeting recordings management (Premium feature)
 * View, download, and manage recorded meetings
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
  Clock,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Lock,
  Play,
  Search,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { useState } from 'react';

interface Recording {
  id: string;
  meetingTitle: string;
  roomId: string;
  date: string;
  duration: number;
  fileSize: string;
  agentName: string;
  attendees: string[];
  hasTranscript: boolean;
  thumbnailUrl?: string;
}

const mockRecordings: Recording[] = [
  {
    id: 'rec-1',
    meetingTitle: 'Product Demo with Acme Corp',
    roomId: 'demo-acme-001',
    date: '2024-12-08',
    duration: 28,
    fileSize: '156 MB',
    agentName: 'Sales Assistant',
    attendees: ['john@acme.com', 'sarah@acme.com'],
    hasTranscript: true,
  },
  {
    id: 'rec-2',
    meetingTitle: 'Technical Support Session',
    roomId: 'support-002',
    date: '2024-12-07',
    duration: 42,
    fileSize: '234 MB',
    agentName: 'Support Agent',
    attendees: ['mike@client.com'],
    hasTranscript: true,
  },
  {
    id: 'rec-3',
    meetingTitle: 'Onboarding Call - NewCo',
    roomId: 'onboard-003',
    date: '2024-12-06',
    duration: 55,
    fileSize: '312 MB',
    agentName: 'Onboarding Agent',
    attendees: ['new@customer.com', 'ceo@newco.com'],
    hasTranscript: false,
  },
  {
    id: 'rec-4',
    meetingTitle: 'Weekly Team Standup',
    roomId: 'team-standup',
    date: '2024-12-05',
    duration: 15,
    fileSize: '84 MB',
    agentName: 'Meeting Assistant',
    attendees: ['team@company.com'],
    hasTranscript: true,
  },
];

// Check if user has premium (mock - would come from auth context)
const isPremium = true;

export function RecordingsPage() {
  const [recordings] = useState<Recording[]>(mockRecordings);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecordings = recordings.filter(
    (r) =>
      r.meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.agentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDuration = recordings.reduce((acc, r) => acc + r.duration, 0);
  const totalSize = recordings.length * 200; // Approximate MB

  if (!isPremium) {
    return <PremiumUpgradePrompt />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Recordings</h1>
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Crown className="mr-1 h-3 w-3" />
              Premium
            </Badge>
          </div>
          <p className="text-gray-600">
            Access and manage your meeting recordings
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{recordings.length}</p>
                <p className="text-sm text-gray-600">Total Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDuration} min</p>
                <p className="text-sm text-gray-600">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {recordings.filter((r) => r.hasTranscript).length}
                </p>
                <p className="text-sm text-gray-600">With Transcripts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2">
                <Download className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSize} MB</p>
                <p className="text-sm text-gray-600">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle>All Recordings</CardTitle>
          <CardDescription>
            {filteredRecordings.length} recordings found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRecordings.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecordingCard({ recording }: { recording: Recording }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-sm">
      {/* Thumbnail placeholder */}
      <div className="flex h-20 w-32 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
        <Play className="h-8 w-8 text-gray-400" />
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{recording.meetingTitle}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {recording.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recording.duration} min
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {recording.attendees.length} attendees
          </span>
          <span className="text-gray-400">|</span>
          <span>{recording.fileSize}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{recording.agentName}</Badge>
          {recording.hasTranscript && (
            <Badge className="bg-purple-100 text-purple-800">
              <FileText className="mr-1 h-3 w-3" />
              Transcript
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 gap-2">
        <Button variant="outline" size="sm">
          <Play className="mr-1 h-3 w-3" />
          Play
        </Button>
        {recording.hasTranscript && (
          <Button variant="outline" size="sm">
            <FileText className="mr-1 h-3 w-3" />
            Transcript
          </Button>
        )}
        <Button variant="outline" size="sm">
          <Download className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function PremiumUpgradePrompt() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Unlock Meeting Recordings</CardTitle>
          <CardDescription className="text-base">
            Upgrade to Premium to access meeting recordings, transcripts, and
            more
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-left text-sm">
            <li className="flex items-center gap-2">
              <Video className="h-4 w-4 text-green-500" />
              <span>Full HD meeting recordings</span>
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <span>AI-powered transcripts</span>
            </li>
            <li className="flex items-center gap-2">
              <Download className="h-4 w-4 text-green-500" />
              <span>Download and share recordings</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span>90-day storage retention</span>
            </li>
          </ul>
          <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Crown className="mr-2 h-4 w-4" />
            Upgrade to Premium
          </Button>
          <Button variant="link" className="w-full">
            <ExternalLink className="mr-2 h-4 w-4" />
            View all pricing plans
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
