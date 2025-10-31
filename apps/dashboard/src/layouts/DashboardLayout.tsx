/**
 * DashboardLayout - Shared layout wrapper for all dashboard pages
 * Provides consistent sidebar, header, and navigation
 */

import { createModuleLogger } from '@platform/shared';
import {
  AppHeader,
  AppShell,
  Avatar,
  AvatarFallback,
  Sidebar,
  type SidebarSection,
} from '@platform/ui';
import {
  BarChart3,
  BookOpen,
  Bot,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
  Video,
  Zap,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChatWidget } from '../components/ChatWidget';

const logger = createModuleLogger('DashboardLayout');

// Route path to title mapping
const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/conversations': 'Conversations',
  '/knowledge': 'Knowledge Base',
  '/personalities': 'AI Personalities',
  '/rooms': 'Meeting Rooms',
  '/team': 'Team',
  '/widget': 'Widget Config',
  '/integrations': 'Integrations',
  '/optimize': 'AI Optimization',
  '/settings': 'Settings',
  '/analytics': 'Analytics',
  '/costs': 'Costs',
  '/escalations': 'Escalations',
  '/deploy': 'Deploy',
  '/api-keys': 'API Keys',
  '/profile': 'Profile',
};

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive title from current route
  const title = routeTitles[location.pathname] || 'Dashboard';

  // Mock user data - will be replaced with real auth
  const user = {
    name: 'John Doe',
    email: 'john@platform.com',
    initials: 'JD',
  };

  // Navigation sections with active state based on current route
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
          id: 'conversations',
          label: 'Conversations',
          icon: MessageSquare,
          href: '/conversations',
          active: location.pathname === '/conversations',
          badge: 12,
        },
        {
          id: 'knowledge',
          label: 'Knowledge',
          icon: BookOpen,
          href: '/knowledge',
          active: location.pathname === '/knowledge',
        },
        {
          id: 'personalities',
          label: 'AI Personalities',
          icon: Bot,
          href: '/personalities',
          active: location.pathname === '/personalities',
        },
      ],
    },
    {
      title: 'Collaboration',
      items: [
        {
          id: 'rooms',
          label: 'Meeting Rooms',
          icon: Video,
          href: '/rooms',
          active: location.pathname === '/rooms',
        },
        {
          id: 'team',
          label: 'Team',
          icon: Users,
          href: '/team',
          active: location.pathname === '/team',
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          id: 'widget',
          label: 'Widget Config',
          icon: Zap,
          href: '/widget-config',
          active: location.pathname === '/widget-config',
        },
        {
          id: 'integrations',
          label: 'Integrations',
          icon: Sparkles,
          href: '/integrations',
          active: location.pathname === '/integrations',
        },
        {
          id: 'optimize',
          label: 'Optimize',
          icon: BarChart3,
          href: '/optimize',
          active: location.pathname === '/optimize',
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

  const handleUserMenuClick = (action: string) => {
    if (action === 'settings') navigate('/settings');
    if (action === 'logout') logger.info('User logout triggered');
    // Add other actions as needed
  };

  return (
    <AppShell
      sidebar={
        <Sidebar
          logo={
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Platform</span>
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
