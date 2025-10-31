/**
 * Card Component Tests
 *
 * Tests Card composition with all subcomponents.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../components/card';

describe('Card', () => {
  describe('Card', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<Card>Card content</Card>);
        expect(screen.getByText('Card content')).toBeInTheDocument();
      });

      it('should render as div element', () => {
        render(<Card data-testid="card">Test</Card>);
        const card = screen.getByTestId('card');
        expect(card.tagName).toBe('DIV');
      });

      it('should have correct display name', () => {
        expect(Card.displayName).toBe('Card');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<Card data-testid="card">Content</Card>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
      });

      it('should accept custom className', () => {
        render(<Card className="custom-card" data-testid="card">Custom</Card>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('custom-card');
      });

      it('should merge className with default styles', () => {
        render(<Card className="p-4" data-testid="card">Merged</Card>);
        const card = screen.getByTestId('card');
        expect(card).toHaveClass('p-4', 'rounded-lg', 'border');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<Card ref={ref as React.RefObject<HTMLDivElement>}>Ref</Card>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });

    describe('Custom Props', () => {
      it('should accept custom id', () => {
        render(<Card id="custom-card" data-testid="card">Test</Card>);
        const card = screen.getByTestId('card');
        expect(card).toHaveAttribute('id', 'custom-card');
      });

      it('should accept data attributes', () => {
        render(<Card data-testid="custom-card">Test</Card>);
        expect(screen.getByTestId('custom-card')).toBeInTheDocument();
      });
    });
  });

  describe('CardHeader', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<CardHeader>Header content</CardHeader>);
        expect(screen.getByText('Header content')).toBeInTheDocument();
      });

      it('should have correct display name', () => {
        expect(CardHeader.displayName).toBe('CardHeader');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<CardHeader data-testid="header">Header</CardHeader>);
        const header = screen.getByTestId('header');
        expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
      });

      it('should accept custom className', () => {
        render(<CardHeader className="custom-header" data-testid="header">Custom</CardHeader>);
        const header = screen.getByTestId('header');
        expect(header).toHaveClass('custom-header');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<CardHeader ref={ref as React.RefObject<HTMLDivElement>}>Header</CardHeader>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });

  describe('CardTitle', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<CardTitle>Card Title</CardTitle>);
        expect(screen.getByText('Card Title')).toBeInTheDocument();
      });

      it('should have correct display name', () => {
        expect(CardTitle.displayName).toBe('CardTitle');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<CardTitle data-testid="title">Title</CardTitle>);
        const title = screen.getByTestId('title');
        expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
      });

      it('should accept custom className', () => {
        render(<CardTitle className="custom-title" data-testid="title">Custom</CardTitle>);
        const title = screen.getByTestId('title');
        expect(title).toHaveClass('custom-title');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<CardTitle ref={ref as React.RefObject<HTMLDivElement>}>Title</CardTitle>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });

  describe('CardDescription', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<CardDescription>Card description</CardDescription>);
        expect(screen.getByText('Card description')).toBeInTheDocument();
      });

      it('should have correct display name', () => {
        expect(CardDescription.displayName).toBe('CardDescription');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<CardDescription data-testid="desc">Description</CardDescription>);
        const desc = screen.getByTestId('desc');
        expect(desc).toHaveClass('text-sm', 'text-muted-foreground');
      });

      it('should accept custom className', () => {
        render(<CardDescription className="custom-desc" data-testid="desc">Custom</CardDescription>);
        const desc = screen.getByTestId('desc');
        expect(desc).toHaveClass('custom-desc');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<CardDescription ref={ref as React.RefObject<HTMLDivElement>}>Desc</CardDescription>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });

  describe('CardContent', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<CardContent>Content text</CardContent>);
        expect(screen.getByText('Content text')).toBeInTheDocument();
      });

      it('should have correct display name', () => {
        expect(CardContent.displayName).toBe('CardContent');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<CardContent data-testid="content">Content</CardContent>);
        const content = screen.getByTestId('content');
        expect(content).toHaveClass('p-6', 'pt-0');
      });

      it('should accept custom className', () => {
        render(<CardContent className="custom-content" data-testid="content">Custom</CardContent>);
        const content = screen.getByTestId('content');
        expect(content).toHaveClass('custom-content');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<CardContent ref={ref as React.RefObject<HTMLDivElement>}>Content</CardContent>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });

  describe('CardFooter', () => {
    describe('Rendering', () => {
      it('should render with content', () => {
        render(<CardFooter>Footer content</CardFooter>);
        expect(screen.getByText('Footer content')).toBeInTheDocument();
      });

      it('should have correct display name', () => {
        expect(CardFooter.displayName).toBe('CardFooter');
      });
    });

    describe('Styling', () => {
      it('should have default styling classes', () => {
        render(<CardFooter data-testid="footer">Footer</CardFooter>);
        const footer = screen.getByTestId('footer');
        expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
      });

      it('should accept custom className', () => {
        render(<CardFooter className="custom-footer" data-testid="footer">Custom</CardFooter>);
        const footer = screen.getByTestId('footer');
        expect(footer).toHaveClass('custom-footer');
      });
    });

    describe('Ref Forwarding', () => {
      it('should forward ref to div element', () => {
        const ref = { current: null };
        render(<CardFooter ref={ref as React.RefObject<HTMLDivElement>}>Footer</CardFooter>);
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });

  describe('Composition', () => {
    it('should render complete card with all parts', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Card content goes here</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description')).toBeInTheDocument();
      expect(screen.getByText('Card content goes here')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should render card without header', () => {
      render(
        <Card data-testid="card">
          <CardContent>Simple card</CardContent>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Simple card')).toBeInTheDocument();
    });

    it('should render card without footer', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render minimal card', () => {
      render(<Card data-testid="card">Minimal card</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Minimal card')).toBeInTheDocument();
    });
  });
});
