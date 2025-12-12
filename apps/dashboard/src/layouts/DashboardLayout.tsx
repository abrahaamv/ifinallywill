/**
 * DashboardLayout - Shared layout wrapper for all dashboard pages
 * Provides consistent sidebar, header, and navigation
 *
 * Sidebar Structure (per plan.md):
 * - MAIN: Home, Conversations, Knowledge Base
 * - AGENTS: AI Personalities, Deployments
 * - MEETINGS: Meeting Rooms, Schedule, Recordings (Premium)
 * - PLATFORM: Integrations, API Keys, Team, Settings
 */

import { createModuleLogger } from '../utils/logger';
import {
  AppHeader,
  AppShell,
  Avatar,
  AvatarFallback,
  Sidebar,
  type SidebarSection,
} from '@platform/ui';
import {
  BookOpen,
  Bot,
  Calendar,
  FileText,
  Headphones,
  Home,
  Key,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChatWidget } from '../components/ChatWidget';
import { useAuth } from '../providers/AuthProvider';

const logger = createModuleLogger('DashboardLayout');

// Route path to title mapping
const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/support': 'Support',
  '/transcripts': 'AI Transcripts',
  '/knowledge': 'Knowledge Base',
  '/personalities': 'AI Personalities',
  '/deployments': 'Deployments',
  '/rooms': 'Meeting Rooms',
  '/schedule': 'Schedule',
  '/recordings': 'Recordings',
  '/integrations': 'Integrations',
  '/api-keys': 'API Keys',
  '/team': 'Team',
  '/settings': 'Settings',
  '/profile': 'Profile',
  // Legacy routes (kept for backwards compatibility)
  '/analytics': 'Analytics',
  '/costs': 'Costs',
  '/escalations': 'Escalations',
  '/deploy': 'Deploy',
  '/optimize': 'AI Optimization',
  '/widget-config': 'Widget Config',
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, signOut } = useAuth();

  // Derive title from current route
  const title = routeTitles[location.pathname] || 'Dashboard';

  // Use authenticated user or fallback to mock data
  const user = authUser
    ? {
        name: authUser.name || authUser.email.split('@')[0] || 'User',
        email: authUser.email,
        initials:
          (authUser.name || authUser.email || 'U')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2) || 'U',
      }
    : {
        name: 'Guest User',
        email: 'guest@visualkit.live',
        initials: 'GU',
      };

  // Navigation sections with active state based on current route
  // Structure per plan.md: MAIN, AGENTS, MEETINGS, PLATFORM
  const sidebarSections: SidebarSection[] = [
    {
      title: 'Main',
      items: [
        {
          id: 'home',
          label: 'Home',
          icon: Home,
          href: '/dashboard',
          active: location.pathname === '/' || location.pathname === '/dashboard',
        },
        {
          id: 'support',
          label: 'Support',
          icon: Headphones,
          href: '/support',
          active: location.pathname === '/support',
        },
        {
          id: 'transcripts',
          label: 'AI Transcripts',
          icon: FileText,
          href: '/transcripts',
          active: location.pathname === '/transcripts',
        },
        {
          id: 'knowledge',
          label: 'Knowledge Base',
          icon: BookOpen,
          href: '/knowledge',
          active: location.pathname === '/knowledge',
        },
      ],
    },
    {
      title: 'Agents',
      items: [
        {
          id: 'personalities',
          label: 'AI Personalities',
          icon: Bot,
          href: '/personalities',
          active: location.pathname === '/personalities',
        },
        {
          id: 'deployments',
          label: 'Deployments',
          icon: Rocket,
          href: '/deployments',
          active: location.pathname === '/deployments',
        },
      ],
    },
    {
      title: 'Meetings',
      items: [
        {
          id: 'rooms',
          label: 'Meeting Rooms',
          icon: Video,
          href: '/rooms',
          active: location.pathname === '/rooms',
        },
        {
          id: 'schedule',
          label: 'Schedule',
          icon: Calendar,
          href: '/schedule',
          active: location.pathname === '/schedule',
        },
        {
          id: 'recordings',
          label: 'Recordings',
          icon: Video,
          href: '/recordings',
          active: location.pathname === '/recordings',
          // Premium badge indicator - using text since badge only accepts string/number
          badge: 'PRO',
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          id: 'integrations',
          label: 'Integrations',
          icon: Sparkles,
          href: '/integrations',
          active: location.pathname === '/integrations',
        },
        {
          id: 'api-keys',
          label: 'API Keys',
          icon: Key,
          href: '/api-keys',
          active: location.pathname === '/api-keys',
        },
        {
          id: 'team',
          label: 'Team',
          icon: Users,
          href: '/team',
          active: location.pathname === '/team',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/settings',
          active: location.pathname === '/settings',
        },
      ],
    },
  ];

  const handleNavigate = (href: string) => {
    navigate(href);
  };

  const handleUserMenuClick = async (action: string) => {
    if (action === 'settings') {
      navigate('/settings');
    } else if (action === 'logout') {
      logger.info('User logout triggered');
      try {
        await signOut();
      } catch (error) {
        logger.error('Logout failed', { error });
      }
    }
    // Add other actions as needed
  };

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo={
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">VisualKit</span>
            </div>
          }
          sections={sidebarSections}
          onNavigate={handleNavigate}
          footer={
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-100 text-xs font-medium text-primary-700">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
          }
        />
      }
      header={
        <AppHeader
          title={title}
          user={user}
          notifications={3}
          onUserMenuClick={handleUserMenuClick}
        />
      }
    >
      {/* Global Chat Widget */}
      <ChatWidget />
      <Outlet />
    </AppShell>
  );
}

