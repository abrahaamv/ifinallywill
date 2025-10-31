/**
 * Progress Component Tests
 *
 * Tests progress bar rendering, values, and accessibility.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Progress } from '../components/progress';

describe('Progress', () => {
  describe('Rendering', () => {
    it('should render with progressbar role', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toBeInTheDocument();
    });

    it('should render as div element', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress.tagName).toBe('DIV');
    });

    it('should have correct display name', () => {
      expect(Progress.displayName).toBe('Progress');
    });
  });

  describe('Value Props', () => {
    it('should default to 0 value', () => {
      render(<Progress />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '0');
    });

    it('should accept custom value', () => {
      render(<Progress value={75} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuenow', '75');
    });

    it('should default to max 100', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemax', '100');
    });

    it('should accept custom max value', () => {
      render(<Progress value={50} max={200} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemax', '200');
    });

    it('should have aria-valuemin of 0', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuemin', '0');
    });

    it('should clamp value to max', () => {
      render(<Progress value={150} max={100} />);
      const progress = screen.getByRole('progressbar');
      // Value should be clamped to 100% (displayed as 100%)
      expect(progress).toHaveAttribute('aria-valuetext', '100%');
    });

    it('should clamp negative values to 0', () => {
      render(<Progress value={-10} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '0%');
    });
  });

  describe('Indeterminate Mode', () => {
    it('should support indeterminate mode', () => {
      render(<Progress indeterminate />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', 'Loading...');
    });

    it('should not have aria-valuenow in indeterminate mode', () => {
      render(<Progress indeterminate />);
      const progress = screen.getByRole('progressbar');
      expect(progress).not.toHaveAttribute('aria-valuenow');
    });

    it('should have pulse animation in indeterminate mode', () => {
      render(<Progress indeterminate />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div');
      expect(indicator).toHaveClass('animate-pulse');
    });
  });

  describe('Percentage Calculations', () => {
    it('should display 0% correctly', () => {
      render(<Progress value={0} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '0%');
    });

    it('should display 25% correctly', () => {
      render(<Progress value={25} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '25%');
    });

    it('should display 50% correctly', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '50%');
    });

    it('should display 75% correctly', () => {
      render(<Progress value={75} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '75%');
    });

    it('should display 100% correctly', () => {
      render(<Progress value={100} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '100%');
    });

    it('should handle fractional percentages', () => {
      render(<Progress value={33.33} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '33%');
    });

    it('should calculate percentage with custom max', () => {
      render(<Progress value={50} max={200} />);
      const progress = screen.getByRole('progressbar');
      // 50/200 = 25%
      expect(progress).toHaveAttribute('aria-valuetext', '25%');
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('relative', 'h-4', 'w-full', 'overflow-hidden', 'rounded-full', 'bg-secondary');
    });

    it('should accept custom className', () => {
      render(<Progress className="custom-class" value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Progress className="h-2" value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveClass('h-2', 'w-full', 'rounded-full');
    });

    it('should have indicator with transition', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div');
      expect(indicator).toHaveClass('transition-all', 'bg-primary');
    });
  });

  describe('Visual Indicator', () => {
    it('should have progress indicator element', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div');
      expect(indicator).toBeInTheDocument();
    });

    it('should position indicator based on percentage', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div') as HTMLElement;
      // 50% = translateX(-50%)
      expect(indicator.style.transform).toBe('translateX(-50%)');
    });

    it('should position indicator at start for 0%', () => {
      render(<Progress value={0} />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div') as HTMLElement;
      expect(indicator.style.transform).toBe('translateX(-100%)');
    });

    it('should position indicator at end for 100%', () => {
      render(<Progress value={100} />);
      const progress = screen.getByRole('progressbar');
      const indicator = progress.querySelector('div') as HTMLElement;
      expect(indicator.style.transform).toBe('translateX(-0%)');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('tabIndex', '0');
    });

    it('should have progressbar role', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('role', 'progressbar');
    });

    it('should have descriptive aria-valuetext', () => {
      render(<Progress value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-valuetext', '50%');
    });

    it('should support aria-label', () => {
      render(<Progress value={50} aria-label="Upload progress" />);
      expect(screen.getByLabelText('Upload progress')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Progress value={50} aria-describedby="progress-desc" />
          <span id="progress-desc">Uploading file</span>
        </>
      );
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('aria-describedby', 'progress-desc');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to progress element', () => {
      const ref = { current: null };
      render(<Progress ref={ref as React.RefObject<HTMLDivElement>} value={50} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should allow ref manipulation', () => {
      const ref = { current: null } as React.RefObject<HTMLDivElement>;
      render(<Progress ref={ref} value={50} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Progress id="upload-progress" value={50} />);
      const progress = screen.getByRole('progressbar');
      expect(progress).toHaveAttribute('id', 'upload-progress');
    });

    it('should accept data attributes', () => {
      render(<Progress data-testid="custom-progress" value={50} />);
      expect(screen.getByTestId('custom-progress')).toBeInTheDocument();
    });
  });

  describe('Use Cases', () => {
    it('should work as upload progress indicator', () => {
      render(<Progress value={65} aria-label="File upload" />);
      const progress = screen.getByLabelText('File upload');
      expect(progress).toHaveAttribute('aria-valuenow', '65');
    });

    it('should work as loading indicator', () => {
      render(<Progress indeterminate aria-label="Loading content" />);
      const progress = screen.getByLabelText('Loading content');
      expect(progress).toHaveAttribute('aria-valuetext', 'Loading...');
    });

    it('should work as task completion indicator', () => {
      render(<Progress value={3} max={5} aria-label="Tasks completed" />);
      const progress = screen.getByLabelText('Tasks completed');
      // 3/5 = 60%
      expect(progress).toHaveAttribute('aria-valuetext', '60%');
    });
  });
});
