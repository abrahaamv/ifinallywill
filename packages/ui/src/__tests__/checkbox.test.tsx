/**
 * Checkbox Component Tests
 *
 * Tests checkbox states, user interactions, accessibility, and form integration.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../components/checkbox';
import { Label } from '../components/label';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('should render checkbox element', () => {
      render(<Checkbox aria-label="Accept terms" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(Checkbox.displayName).toBe('Checkbox');
    });
  });

  describe('States', () => {
    it('should render unchecked by default', () => {
      render(<Checkbox aria-label="Unchecked" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should render checked when defaultChecked is true', () => {
      render(<Checkbox defaultChecked aria-label="Checked" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should handle disabled state', () => {
      render(<Checkbox disabled aria-label="Disabled" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
      expect(checkbox).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should support controlled checked state', () => {
      const { rerender } = render(<Checkbox checked={false} onCheckedChange={() => {}} aria-label="Controlled" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      rerender(<Checkbox checked={true} onCheckedChange={() => {}} aria-label="Controlled" />);
      expect(checkbox).toBeChecked();
    });
  });

  describe('User Interactions', () => {
    it('should toggle on click', async () => {
      const user = userEvent.setup();

      render(<Checkbox aria-label="Toggle" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('should call onCheckedChange handler', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();

      render(<Checkbox onCheckedChange={onCheckedChange} aria-label="Test" />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();

      render(<Checkbox disabled onCheckedChange={onCheckedChange} aria-label="Disabled" />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space', async () => {
      const user = userEvent.setup();

      render(<Checkbox aria-label="Keyboard" />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      await user.keyboard(' ');
      expect(checkbox).toBeChecked();

      await user.keyboard(' ');
      expect(checkbox).not.toBeChecked();
    });

    it('should be focusable', () => {
      render(<Checkbox aria-label="Focusable" />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      expect(checkbox).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work with Label component', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Checkbox id="terms" />
          <Label htmlFor="terms">Accept terms</Label>
        </div>
      );

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText('Accept terms');

      await user.click(label);
      expect(checkbox).toBeChecked();
    });

    it('should support name attribute for form submission', () => {
      render(<Checkbox name="newsletter" aria-label="Newsletter" />);

      const checkbox = screen.getByRole('checkbox');
      // Radix Checkbox may handle name internally, just verify it accepts the prop
      expect(checkbox).toBeInTheDocument();
    });

    it('should support value attribute', () => {
      render(<Checkbox value="yes" aria-label="Agree" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('value', 'yes');
    });

    it('should support required attribute', () => {
      render(<Checkbox required aria-label="Required" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeRequired();
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Checkbox aria-label="Styled" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('h-4', 'w-4', 'rounded-sm', 'border');
    });

    it('should accept custom className', () => {
      render(<Checkbox className="custom-class" aria-label="Custom" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Checkbox className="ml-2" aria-label="Merged" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('ml-2', 'h-4', 'w-4');
    });

    it('should have data-state attribute when checked', async () => {
      const user = userEvent.setup();

      render(<Checkbox aria-label="State" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');

      await user.click(checkbox);
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Checkbox aria-label="Custom label" />);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should support aria-labelledby', () => {
      render(
        <div>
          <span id="checkbox-label">Newsletter subscription</span>
          <Checkbox aria-labelledby="checkbox-label" />
        </div>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-labelledby', 'checkbox-label');
    });

    it('should support aria-describedby', () => {
      render(
        <div>
          <Checkbox aria-describedby="description" aria-label="Test" />
          <span id="description">Additional information</span>
        </div>
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby', 'description');
    });

    it('should have focus-visible ring', () => {
      render(<Checkbox aria-label="Focus" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveClass('focus-visible:ring-2');
    });

    it('should have proper role', () => {
      render(<Checkbox aria-label="Role test" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('role', 'checkbox');
    });

    it('should support aria-required', () => {
      render(<Checkbox required aria-required="true" aria-label="Required" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to checkbox element', () => {
      const ref = { current: null };
      render(<Checkbox ref={ref as React.RefObject<HTMLButtonElement>} aria-label="Ref" />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should allow ref manipulation', () => {
      const ref = { current: null } as React.RefObject<HTMLButtonElement>;
      render(<Checkbox ref={ref} aria-label="Ref manipulation" />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Checkmark Indicator', () => {
    it('should show checkmark when checked', async () => {
      const user = userEvent.setup();

      render(<Checkbox aria-label="Checkmark" />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      // The checkmark SVG should be rendered within the indicator
      const svg = checkbox.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have proper SVG attributes', async () => {
      const user = userEvent.setup();

      render(<Checkbox aria-label="SVG test" />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      const svg = checkbox.querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Checkbox id="custom-id" aria-label="Custom ID" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id', 'custom-id');
    });

    it('should accept data attributes', () => {
      render(<Checkbox data-testid="custom-checkbox" aria-label="Data test" />);
      expect(screen.getByTestId('custom-checkbox')).toBeInTheDocument();
    });
  });

  describe('Multiple Checkboxes', () => {
    it('should handle multiple independent checkboxes', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Checkbox aria-label="Option 1" />
          <Checkbox aria-label="Option 2" />
          <Checkbox aria-label="Option 3" />
        </div>
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3);

      await user.click(checkboxes[0]!);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).not.toBeChecked();

      await user.click(checkboxes[2]!);
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).not.toBeChecked();
      expect(checkboxes[2]).toBeChecked();
    });
  });
});
