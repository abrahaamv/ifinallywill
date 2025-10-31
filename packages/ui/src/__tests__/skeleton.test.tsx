/**
 * Skeleton Component Tests
 *
 * Tests loading placeholder rendering and styling.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from '../components/skeleton';

describe('Skeleton', () => {
  describe('Rendering', () => {
    it('should render as div element', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.tagName).toBe('DIV');
    });

    it('should render with content if provided', () => {
      render(<Skeleton>Loading...</Skeleton>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render empty by default', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton.textContent).toBe('');
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse', 'rounded-md', 'bg-muted');
    });

    it('should have pulse animation', () => {
      render(<Skeleton data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('animate-pulse');
    });

    it('should accept custom className', () => {
      render(<Skeleton className="custom-class" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Skeleton className="h-4 w-full" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveClass('h-4', 'w-full', 'animate-pulse', 'rounded-md');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Skeleton id="custom-skeleton" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('id', 'custom-skeleton');
    });

    it('should accept data attributes', () => {
      render(<Skeleton data-testid="custom-skeleton" />);
      expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
    });

    it('should accept aria-label', () => {
      render(<Skeleton aria-label="Loading content" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    });
  });

  describe('Common Patterns', () => {
    it('should render text skeleton with height', () => {
      render(<Skeleton className="h-4 w-full" data-testid="text-skeleton" />);
      const skeleton = screen.getByTestId('text-skeleton');
      expect(skeleton).toHaveClass('h-4', 'w-full');
    });

    it('should render circular skeleton for avatar', () => {
      render(<Skeleton className="h-12 w-12 rounded-full" data-testid="avatar-skeleton" />);
      const skeleton = screen.getByTestId('avatar-skeleton');
      expect(skeleton).toHaveClass('h-12', 'w-12', 'rounded-full');
    });

    it('should render rectangular skeleton for image', () => {
      render(<Skeleton className="h-48 w-full" data-testid="image-skeleton" />);
      const skeleton = screen.getByTestId('image-skeleton');
      expect(skeleton).toHaveClass('h-48', 'w-full');
    });

    it('should render button skeleton', () => {
      render(<Skeleton className="h-10 w-24" data-testid="button-skeleton" />);
      const skeleton = screen.getByTestId('button-skeleton');
      expect(skeleton).toHaveClass('h-10', 'w-24');
    });
  });

  describe('Multiple Skeletons', () => {
    it('should render multiple skeletons for list', () => {
      render(
        <div>
          <Skeleton className="h-4 w-full mb-2" data-testid="skeleton-1" />
          <Skeleton className="h-4 w-3/4 mb-2" data-testid="skeleton-2" />
          <Skeleton className="h-4 w-1/2" data-testid="skeleton-3" />
        </div>
      );

      expect(screen.getByTestId('skeleton-1')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-2')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-3')).toBeInTheDocument();
    });

    it('should render card skeleton with multiple parts', () => {
      render(
        <div className="space-y-4" data-testid="card-skeleton">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      );

      expect(screen.getByTestId('card-skeleton')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label for screen readers', () => {
      render(<Skeleton aria-label="Loading profile" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading profile');
    });

    it('should support aria-hidden', () => {
      render(<Skeleton aria-hidden="true" data-testid="skeleton" />);
      const skeleton = screen.getByTestId('skeleton');
      expect(skeleton).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Usage Examples', () => {
    it('should work as profile card skeleton', () => {
      render(
        <div data-testid="profile-skeleton">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        </div>
      );

      expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    });

    it('should work as article skeleton', () => {
      render(
        <div data-testid="article-skeleton" className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );

      expect(screen.getByTestId('article-skeleton')).toBeInTheDocument();
    });
  });
});
