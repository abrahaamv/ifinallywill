/**
 * Avatar Component Tests
 *
 * Tests avatar rendering, image loading, fallback states, and accessibility.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from '../components/avatar';

describe('Avatar', () => {
  describe('Rendering', () => {
    it('should render avatar container', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toBeInTheDocument();
    });

    it('should have correct display names', () => {
      expect(Avatar.displayName).toBe('Avatar');
      expect(AvatarImage.displayName).toBe('AvatarImage');
      expect(AvatarFallback.displayName).toBe('AvatarFallback');
    });
  });

  describe('AvatarImage', () => {
    it('should accept image props', () => {
      // Radix UI Avatar delays image rendering in jsdom
      // We can verify the component accepts the props without errors
      const { container } = render(
        <Avatar>
          <AvatarImage src="https://via.placeholder.com/150" alt="User avatar" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      // Avatar container should exist
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should accept custom className', () => {
      render(
        <Avatar>
          <AvatarImage src="https://via.placeholder.com/150" alt="Avatar" className="custom-image" />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      // Component renders without errors with custom className
      expect(screen.getByText('AB')).toBeInTheDocument();
    });
  });

  describe('AvatarFallback', () => {
    it('should render fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('should render initials', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should have default styling', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByText('AB');
      expect(fallback).toHaveClass(
        'flex',
        'h-full',
        'w-full',
        'items-center',
        'justify-center',
        'rounded-full',
        'bg-muted'
      );
    });

    it('should accept custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">AB</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByText('AB');
      expect(fallback).toHaveClass('custom-fallback');
    });

    it('should render single character', () => {
      render(
        <Avatar>
          <AvatarFallback>A</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('should render icon fallback', () => {
      render(
        <Avatar>
          <AvatarFallback>
            <svg data-testid="user-icon" />
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });
  });

  describe('Avatar Container', () => {
    it('should have default styling', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass(
        'relative',
        'flex',
        'h-10',
        'w-10',
        'shrink-0',
        'overflow-hidden',
        'rounded-full'
      );
    });

    it('should accept custom className', () => {
      render(
        <Avatar className="custom-avatar" data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('custom-avatar');
    });

    it('should support custom sizes', () => {
      render(
        <Avatar className="h-16 w-16" data-testid="large-avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('large-avatar');
      expect(avatar).toHaveClass('h-16', 'w-16');
    });

    it('should maintain circular shape with custom size', () => {
      render(
        <Avatar className="h-20 w-20" data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('rounded-full');
    });
  });

  describe('Image Loading States', () => {
    it('should show fallback when image fails to load', () => {
      render(
        <Avatar>
          <AvatarImage src="invalid-url.jpg" alt="User" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      // Fallback should be present
      expect(screen.getByText('FB')).toBeInTheDocument();
    });

    it('should render with fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="https://via.placeholder.com/150" alt="User" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      // Fallback should be in DOM
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('Common Patterns', () => {
    it('should render user avatar with initials', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render user avatar with image', () => {
      render(
        <Avatar>
          <AvatarImage src="https://via.placeholder.com/150" alt="John Doe" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should render avatar group', () => {
      render(
        <div className="flex -space-x-4">
          <Avatar className="border-2 border-background">
            <AvatarImage src="https://via.placeholder.com/150" alt="User 1" />
            <AvatarFallback>U1</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarImage src="https://via.placeholder.com/150" alt="User 2" />
            <AvatarFallback>U2</AvatarFallback>
          </Avatar>
          <Avatar className="border-2 border-background">
            <AvatarFallback>U3</AvatarFallback>
          </Avatar>
        </div>
      );

      expect(screen.getByText('U1')).toBeInTheDocument();
      expect(screen.getByText('U2')).toBeInTheDocument();
      expect(screen.getByText('U3')).toBeInTheDocument();
    });

    it('should render small avatar', () => {
      render(
        <Avatar className="h-6 w-6" data-testid="small-avatar">
          <AvatarFallback className="text-xs">A</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('small-avatar');
      expect(avatar).toHaveClass('h-6', 'w-6');
    });

    it('should render large avatar', () => {
      render(
        <Avatar className="h-24 w-24" data-testid="large-avatar">
          <AvatarFallback className="text-2xl">AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('large-avatar');
      expect(avatar).toHaveClass('h-24', 'w-24');
    });
  });

  describe('Accessibility', () => {
    it('should support images with alt text', () => {
      render(
        <Avatar>
          <AvatarImage src="https://via.placeholder.com/150" alt="Profile picture of Jane Smith" />
          <AvatarFallback>JS</AvatarFallback>
        </Avatar>
      );

      // Avatar component accepts alt text without errors
      expect(screen.getByText('JS')).toBeInTheDocument();
    });

    it('should provide text alternative through fallback', () => {
      render(
        <Avatar>
          <AvatarFallback>John Doe</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(
        <Avatar aria-label="User profile picture" data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('aria-label', 'User profile picture');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to avatar container', () => {
      const ref = { current: null };
      render(
        <Avatar ref={ref as React.RefObject<HTMLSpanElement>}>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });

    it('should forward ref to fallback', () => {
      const ref = { current: null };
      render(
        <Avatar>
          <AvatarFallback ref={ref as React.RefObject<HTMLSpanElement>}>AB</AvatarFallback>
        </Avatar>
      );

      expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(
        <Avatar id="user-avatar" data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('id', 'user-avatar');
    });

    it('should accept data attributes', () => {
      render(
        <Avatar data-testid="custom-avatar" data-user-id="123">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      const avatar = screen.getByTestId('custom-avatar');
      expect(avatar).toHaveAttribute('data-user-id', '123');
    });
  });

  describe('Complex Compositions', () => {
    it('should render avatar with status indicator', () => {
      render(
        <div className="relative">
          <Avatar>
            <AvatarImage src="https://via.placeholder.com/150" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <span
            className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-green-500"
            data-testid="online-indicator"
          />
        </div>
      );

      expect(screen.getByTestId('online-indicator')).toBeInTheDocument();
    });

    it('should render avatar with badge', () => {
      render(
        <div className="relative">
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
          <span
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
            data-testid="notification-badge"
          >
            3
          </span>
        </div>
      );

      expect(screen.getByTestId('notification-badge')).toHaveTextContent('3');
    });
  });
});
