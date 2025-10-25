/**
 * AppHeader - Application header with search, notifications, and user menu
 * Modern design with full accessibility support
 */

import { Bell, ChevronDown, Search, Settings } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';
import { Badge } from '../badge';
import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Input } from '../input';

interface AppHeaderProps {
  title?: string;
  breadcrumbs?: ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
  };
  notifications?: number;
  onSearch?: (query: string) => void;
  onNotificationClick?: () => void;
  onUserMenuClick?: (action: string) => void;
}

export function AppHeader({
  title,
  breadcrumbs,
  user,
  notifications = 0,
  onSearch,
  onNotificationClick,
  onUserMenuClick,
}: AppHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="flex h-16 items-center justify-between px-6">
      {/* Left: Title/Breadcrumbs */}
      <div className="flex items-center gap-4">
        {breadcrumbs || (title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>)}
      </div>

      {/* Right: Search, Notifications, User Menu */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="relative" role="search">
          <label htmlFor="global-search" className="sr-only">
            Search
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <Input
            id="global-search"
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-9"
            aria-label="Search the application"
          />
        </form>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={onNotificationClick}
          aria-label={
            notifications > 0
              ? `${notifications} unread notification${notifications > 1 ? 's' : ''}`
              : 'No new notifications'
          }
        >
          <Bell className="h-5 w-5 text-gray-600" aria-hidden="true" />
          {notifications > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
              aria-hidden="true"
            >
              {notifications > 9 ? '9+' : notifications}
            </Badge>
          )}
          <span className="sr-only">
            {notifications > 0
              ? `You have ${notifications} unread notification${notifications > 1 ? 's' : ''}`
              : 'You have no new notifications'}
          </span>
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu onOpenChange={setIsUserMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-3 px-2 py-1.5 hover:bg-gray-100"
                aria-label="User account menu"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={`${user.name}'s profile picture`} />
                  <AvatarFallback className="bg-primary-100 text-xs font-medium text-primary-700">
                    {user.initials || user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUserMenuClick?.('profile')} role="menuitem">
                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUserMenuClick?.('billing')} role="menuitem">
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUserMenuClick?.('support')} role="menuitem">
                Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onUserMenuClick?.('logout')}
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                role="menuitem"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
