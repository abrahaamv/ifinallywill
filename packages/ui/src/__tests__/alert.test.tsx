/**
 * Alert Component Tests
 *
 * Tests Alert, AlertTitle, and AlertDescription components with variants.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert, AlertTitle, AlertDescription } from '../components/alert';

describe('Alert', () => {
  describe('Alert', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<Alert>Alert message</Alert>);
        expect(screen.getByText('Alert message')).toBeInTheDocument();
      });

      it('should render as div with alert role', () => {
        render(<Alert>Test</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert.tagName).toBe('DIV');
      });

      it('should have correct display name', () => {
        expect(Alert.displayName).toBe('Alert');
      });
    });

    describe('Variants', () => {
      it('should render default variant', () => {
        render(<Alert>Default Alert</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('bg-background', 'text-foreground');
      });

      it('should render destructive variant', () => {
        render(<Alert variant="destructive">Error Alert</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('border-destructive/50', 'text-destructive');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<Alert>Styled Alert</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4');
      });

      it('should accept custom className', () => {
        render(<Alert className="custom-class">Custom</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('custom-class');
      });

      it('should merge className with default styles', () => {
        render(<Alert className="mb-4">Merged</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('mb-4', 'rounded-lg', 'border');
      });
    });

    describe('Accessibility', () => {
      it('should have alert role', () => {
        render(<Alert>Accessible Alert</Alert>);
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      it('should support aria-label', () => {
        render(<Alert aria-label="Custom label">Alert</Alert>);
        expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
      });

      it('should support aria-describedby', () => {
        render(
          <div>
            <Alert aria-describedby="description">Alert</Alert>
            <span id="description">Additional info</span>
          </div>
        );
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-describedby', 'description');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<Alert ref={ref as React.RefObject<HTMLDivElement>}>Ref</Alert>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });

    describe('Icon Support', () => {
      it('should render with icon', () => {
        render(
          <Alert>
            <svg data-testid="alert-icon">
              <title>Icon</title>
            </svg>
            <div>Alert with icon</div>
          </Alert>
        );
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
        expect(screen.getByText('Alert with icon')).toBeInTheDocument();
      });

      it('should have icon positioning classes', () => {
        render(<Alert>Alert</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveClass('[&>svg]:absolute', '[&>svg]:left-4', '[&>svg]:top-4');
      });
    });

    describe('Custom Props', () => {
      it('should accept custom id', () => {
        render(<Alert id="custom-alert">Test</Alert>);
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('id', 'custom-alert');
      });

      it('should accept data attributes', () => {
        render(<Alert data-testid="custom-alert">Test</Alert>);
        expect(screen.getByTestId('custom-alert')).toBeInTheDocument();
      });
    });
  });

  describe('AlertTitle', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<AlertTitle>Alert Title</AlertTitle>);
        expect(screen.getByText('Alert Title')).toBeInTheDocument();
      });

      it('should render as h5 heading', () => {
        render(<AlertTitle>Title</AlertTitle>);
        const title = screen.getByText('Title');
        expect(title.tagName).toBe('H5');
      });

      it('should have correct display name', () => {
        expect(AlertTitle.displayName).toBe('AlertTitle');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<AlertTitle>Styled Title</AlertTitle>);
        const title = screen.getByText('Styled Title');
        expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight');
      });

      it('should accept custom className', () => {
        render(<AlertTitle className="custom-title">Custom</AlertTitle>);
        const title = screen.getByText('Custom');
        expect(title).toHaveClass('custom-title');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to h5 element', () => {
        const ref = { current: null };
        render(<AlertTitle ref={ref as React.RefObject<HTMLParagraphElement>}>Title</AlertTitle>);
        expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
      });
    });
  });

  describe('AlertDescription', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<AlertDescription>Alert description text</AlertDescription>);
        expect(screen.getByText('Alert description text')).toBeInTheDocument();
      });

      it('should render as div element', () => {
        render(<AlertDescription>Description</AlertDescription>);
        const desc = screen.getByText('Description');
        expect(desc.tagName).toBe('DIV');
      });

      it('should have correct display name', () => {
        expect(AlertDescription.displayName).toBe('AlertDescription');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<AlertDescription>Styled Description</AlertDescription>);
        const desc = screen.getByText('Styled Description');
        expect(desc).toHaveClass('text-sm', '[&_p]:leading-relaxed');
      });

      it('should accept custom className', () => {
        render(<AlertDescription className="custom-desc">Custom</AlertDescription>);
        const desc = screen.getByText('Custom');
        expect(desc).toHaveClass('custom-desc');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<AlertDescription ref={ref as React.RefObject<HTMLParagraphElement>}>Desc</AlertDescription>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });

    describe('Paragraph Formatting', () => {
      it('should handle multiple paragraphs', () => {
        render(
          <AlertDescription>
            <p>First paragraph</p>
            <p>Second paragraph</p>
          </AlertDescription>
        );
        expect(screen.getByText('First paragraph')).toBeInTheDocument();
        expect(screen.getByText('Second paragraph')).toBeInTheDocument();
      });
    });
  });

  describe('Composition', () => {
    it('should render complete alert with all parts', () => {
      render(
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Your changes have been saved.</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
      expect(screen.getByText('Your changes have been saved.')).toBeInTheDocument();
    });

    it('should render destructive alert with icon', () => {
      render(
        <Alert variant="destructive">
          <svg data-testid="error-icon" aria-hidden="true" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong.</AlertDescription>
        </Alert>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('text-destructive');
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    });

    it('should render alert with only description', () => {
      render(
        <Alert>
          <AlertDescription>Simple alert message</AlertDescription>
        </Alert>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Simple alert message')).toBeInTheDocument();
    });
  });
});
