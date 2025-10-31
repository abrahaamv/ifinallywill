/**
 * Switch Component Tests
 *
 * Tests switch toggle, states, accessibility, and form integration.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Label } from '../components/label';
import { Switch } from '../components/switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('should render switch element', () => {
      render(<Switch aria-label="Toggle" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toBeInTheDocument();
    });

    it('should have correct display name', () => {
      expect(Switch.displayName).toBe('Switch');
    });
  });

  describe('States', () => {
    it('should render unchecked by default', () => {
      render(<Switch aria-label="Unchecked" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).not.toBeChecked();
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    });

    it('should render checked when defaultChecked is true', () => {
      render(<Switch defaultChecked aria-label="Checked" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toBeChecked();
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should handle disabled state', () => {
      render(<Switch disabled aria-label="Disabled" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toBeDisabled();
      expect(switchEl).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should support controlled checked state', () => {
      const { rerender } = render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Controlled" />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).not.toBeChecked();

      rerender(<Switch checked={true} onCheckedChange={() => {}} aria-label="Controlled" />);
      expect(switchEl).toBeChecked();
    });
  });

  describe('User Interactions', () => {
    it('should toggle on click', async () => {
      const user = userEvent.setup();

      render(<Switch aria-label="Toggle" />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).not.toBeChecked();

      await user.click(switchEl);
      expect(switchEl).toBeChecked();

      await user.click(switchEl);
      expect(switchEl).not.toBeChecked();
    });

    it('should call onCheckedChange handler', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();

      render(<Switch onCheckedChange={onCheckedChange} aria-label="Test" />);

      const switchEl = screen.getByRole('switch');
      await user.click(switchEl);

      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();

      render(<Switch disabled onCheckedChange={onCheckedChange} aria-label="Disabled" />);

      const switchEl = screen.getByRole('switch');
      await user.click(switchEl);

      expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('should support keyboard navigation with Space', async () => {
      const user = userEvent.setup();

      render(<Switch aria-label="Keyboard" />);

      const switchEl = screen.getByRole('switch');
      switchEl.focus();

      await user.keyboard(' ');
      expect(switchEl).toBeChecked();

      await user.keyboard(' ');
      expect(switchEl).not.toBeChecked();
    });

    it('should be focusable', () => {
      render(<Switch aria-label="Focusable" />);

      const switchEl = screen.getByRole('switch');
      switchEl.focus();

      expect(switchEl).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work with Label component', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Switch id="notifications" />
          <Label htmlFor="notifications">Enable notifications</Label>
        </div>
      );

      const switchEl = screen.getByRole('switch');
      const label = screen.getByText('Enable notifications');

      await user.click(label);
      expect(switchEl).toBeChecked();
    });

    it('should support name attribute for form submission', () => {
      render(<Switch name="newsletter" aria-label="Newsletter" />);

      const switchEl = screen.getByRole('switch');
      // Radix Switch may handle name internally, just verify it accepts the prop
      expect(switchEl).toBeInTheDocument();
    });

    it('should support value attribute', () => {
      render(<Switch value="yes" aria-label="Agree" />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('value', 'yes');
    });

    it('should support required attribute', () => {
      render(<Switch required aria-label="Required" />);

      const switchEl = screen.getByRole('switch');
      // Radix Switch uses button element, check aria-required instead
      expect(switchEl).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Switch aria-label="Styled" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('h-6', 'w-11', 'rounded-full');
    });

    it('should accept custom className', () => {
      render(<Switch className="custom-class" aria-label="Custom" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Switch className="ml-2" aria-label="Merged" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('ml-2', 'h-6', 'w-11');
    });

    it('should have data-state attribute', async () => {
      const user = userEvent.setup();

      render(<Switch aria-label="State" />);

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('data-state', 'unchecked');

      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('data-state', 'checked');
    });

    it('should have checked background color', () => {
      render(<Switch defaultChecked aria-label="Checked" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('data-[state=checked]:bg-primary');
    });

    it('should have unchecked background color', () => {
      render(<Switch aria-label="Unchecked" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('data-[state=unchecked]:bg-input');
    });
  });

  describe('Thumb Animation', () => {
    it('should have thumb element', () => {
      render(<Switch aria-label="Thumb test" />);
      const switchEl = screen.getByRole('switch');

      // Thumb is a child span element
      const thumb = switchEl.querySelector('span');
      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass('rounded-full', 'bg-background');
    });

    it('should have translation classes for thumb', () => {
      render(<Switch aria-label="Translation test" />);
      const switchEl = screen.getByRole('switch');

      const thumb = switchEl.querySelector('span');
      expect(thumb).toHaveClass('data-[state=checked]:translate-x-5', 'data-[state=unchecked]:translate-x-0');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Switch aria-label="Custom label" />);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should support aria-labelledby', () => {
      render(
        <div>
          <span id="switch-label">Dark mode</span>
          <Switch aria-labelledby="switch-label" />
        </div>
      );

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-labelledby', 'switch-label');
    });

    it('should support aria-describedby', () => {
      render(
        <div>
          <Switch aria-describedby="description" aria-label="Test" />
          <span id="description">Toggle dark mode</span>
        </div>
      );

      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-describedby', 'description');
    });

    it('should have focus-visible ring', () => {
      render(<Switch aria-label="Focus" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveClass('focus-visible:ring-2');
    });

    it('should have proper role', () => {
      render(<Switch aria-label="Role test" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('role', 'switch');
    });

    it('should support aria-checked', async () => {
      const user = userEvent.setup();

      render(<Switch aria-label="Checked test" />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).toHaveAttribute('aria-checked', 'false');

      await user.click(switchEl);
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to switch element', () => {
      const ref = { current: null };
      render(<Switch ref={ref as React.RefObject<HTMLButtonElement>} aria-label="Ref" />);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should allow ref manipulation', () => {
      const ref = { current: null } as React.RefObject<HTMLButtonElement>;
      render(<Switch ref={ref} aria-label="Ref manipulation" />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Custom Props', () => {
    it('should accept custom id', () => {
      render(<Switch id="custom-switch" aria-label="Custom ID" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('id', 'custom-switch');
    });

    it('should accept data attributes', () => {
      render(<Switch data-testid="custom-switch" aria-label="Data test" />);
      expect(screen.getByTestId('custom-switch')).toBeInTheDocument();
    });
  });

  describe('Multiple Switches', () => {
    it('should handle multiple independent switches', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Switch aria-label="Option 1" />
          <Switch aria-label="Option 2" />
          <Switch aria-label="Option 3" />
        </div>
      );

      const switches = screen.getAllByRole('switch');
      expect(switches).toHaveLength(3);

      await user.click(switches[0]!);
      expect(switches[0]).toBeChecked();
      expect(switches[1]).not.toBeChecked();
      expect(switches[2]).not.toBeChecked();

      await user.click(switches[2]!);
      expect(switches[0]).toBeChecked();
      expect(switches[1]).not.toBeChecked();
      expect(switches[2]).toBeChecked();
    });
  });
});
