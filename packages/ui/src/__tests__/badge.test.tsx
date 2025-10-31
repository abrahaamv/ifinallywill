/**
 * Badge Component Tests
 *
 * Tests badge variants, styling, and accessibility.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../components/badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render with content', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(<Badge>Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge.tagName).toBe('DIV');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
    });

    it('should render secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
    });

    it('should render destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-destructive', 'text-destructive-foreground');
    });

    it('should render outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      const badge = screen.getByText('Outline');
      expect(badge).toHaveClass('text-foreground');
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Badge>Styled</Badge>);
      const badge = screen.getByText('Styled');
      expect(badge).toHaveClass(
        'inline-flex',
        'items-center',
        'rounded-full',
        'border',
        'px-2.5',
        'py-0.5',
        'text-xs',
        'font-semibold'
      );
    });

    it('should accept custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Badge className="ml-2">Merged</Badge>);
      const badge = screen.getByText('Merged');
      expect(badge).toHaveClass('ml-2', 'rounded-full', 'text-xs');
    });

    it('should have transition classes', () => {
      render(<Badge>Transition</Badge>);
      const badge = screen.getByText('Transition');
      expect(badge).toHaveClass('transition-colors');
    });

    it('should have focus ring classes', () => {
      render(<Badge>Focus</Badge>);
      const badge = screen.getByText('Focus');
      expect(badge).toHaveClass('focus:ring-2', 'focus:ring-ring', 'focus:ring-offset-2');
    });
  });

  describe('Content Types', () => {
    it('should render string content', () => {
      render(<Badge>Text Badge</Badge>);
      expect(screen.getByText('Text Badge')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <Badge>
          <svg data-testid="badge-icon">
            <title>Icon</title>
          </svg>
          <span>With Icon</span>
        </Badge>
      );
      expect(screen.getByTestId('badge-icon')).toBeInTheDocument();
      expect(screen.getByText('With Icon')).toBeInTheDocument();
    });

    it('should render number content', () => {
      render(<Badge>42</Badge>);
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Badge id="custom-badge">Test</Badge>);
      const badge = screen.getByText('Test');
      expect(badge).toHaveAttribute('id', 'custom-badge');
    });

    it('should accept data attributes', () => {
      render(<Badge data-testid="custom-badge">Test</Badge>);
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });

    it('should accept aria-label', () => {
      render(<Badge aria-label="Status badge">Active</Badge>);
      expect(screen.getByLabelText('Status badge')).toBeInTheDocument();
    });
  });

  describe('Multiple Badges', () => {
    it('should render multiple independent badges', () => {
      render(
        <div>
          <Badge>Badge 1</Badge>
          <Badge variant="secondary">Badge 2</Badge>
          <Badge variant="destructive">Badge 3</Badge>
        </div>
      );

      expect(screen.getByText('Badge 1')).toBeInTheDocument();
      expect(screen.getByText('Badge 2')).toBeInTheDocument();
      expect(screen.getByText('Badge 3')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('should work as status indicator', () => {
      render(<Badge variant="secondary">Active</Badge>);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should work as tag', () => {
      render(<Badge variant="outline">React</Badge>);
      expect(screen.getByText('React')).toBeInTheDocument();
    });

    it('should work as count indicator', () => {
      render(<Badge variant="destructive">5</Badge>);
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
