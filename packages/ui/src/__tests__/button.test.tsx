/**
 * Button Component Tests
 *
 * Tests button variants, sizes, accessibility, and composition patterns.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../components/button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render as button element by default', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-input');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should render default size', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-4', 'py-2');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-11', 'px-8');
    });

    it('should render icon size', () => {
      render(<Button size="icon" aria-label="Icon button">X</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'w-10');
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
    });

    it('should not trigger onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button disabled onClick={onClick}>Disabled</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should trigger onClick handler', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click</Button>);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Press Enter</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onClick).toHaveBeenCalledOnce();
    });

    it('should support space key activation', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Press Space</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(onClick).toHaveBeenCalledOnce();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should merge className with variant classes', () => {
      render(<Button variant="destructive" className="custom-class">Merged</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-destructive', 'custom-class');
    });

    it('should accept aria-label', () => {
      render(<Button aria-label="Custom label">Button</Button>);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should not have default type attribute', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      // React button elements don't have default type unless explicitly set
      expect(button.getAttribute('type')).toBeNull();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null };
      render(<Button ref={ref as React.RefObject<HTMLButtonElement>}>Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Composition with asChild', () => {
    it('should render children when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/test');
      expect(link).toHaveTextContent('Link Button');
    });

    it('should apply button classes to child element', () => {
      render(
        <Button asChild variant="destructive">
          <a href="/delete">Delete Link</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toHaveClass('bg-destructive');
    });
  });

  describe('Accessibility', () => {
    it('should have focus-visible ring', () => {
      render(<Button>Focus me</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('should be keyboard accessible', () => {
      render(<Button>Accessible</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should support aria-pressed for toggle buttons', () => {
      render(<Button aria-pressed="true">Toggle</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
