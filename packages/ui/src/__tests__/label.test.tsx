/**
 * Label Component Tests
 *
 * Tests label rendering, form association, accessibility, and peer-disabled states.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../components/input';
import { Label } from '../components/label';

describe('Label', () => {
  describe('Rendering', () => {
    it('should render with text content', () => {
      render(<Label>Username</Label>);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should render as label element', () => {
      render(<Label>Test Label</Label>);
      const label = screen.getByText('Test Label');
      expect(label.tagName).toBe('LABEL');
    });

    it('should have correct display name', () => {
      expect(Label.displayName).toBe('Label');
    });
  });

  describe('Form Association', () => {
    it('should associate with input via htmlFor', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" />
        </div>
      );

      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('for', 'username');
    });

    it('should allow clicking label to focus input', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="Enter email" />
        </div>
      );

      const label = screen.getByText('Email');
      const input = screen.getByPlaceholderText('Enter email');

      await user.click(label);
      expect(input).toHaveFocus();
    });

    it('should work with implicit association', async () => {
      const user = userEvent.setup();

      render(
        <Label>
          Password
          <Input type="password" placeholder="Enter password" />
        </Label>
      );

      const label = screen.getByText('Password');
      const input = screen.getByPlaceholderText('Enter password');

      await user.click(label);
      expect(input).toHaveFocus();
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Label>Styled Label</Label>);
      const label = screen.getByText('Styled Label');
      expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none');
    });

    it('should accept custom className', () => {
      render(<Label className="custom-class">Custom</Label>);
      const label = screen.getByText('Custom');
      expect(label).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Label className="text-red-500">Merged</Label>);
      const label = screen.getByText('Merged');
      expect(label).toHaveClass('text-red-500', 'font-medium');
    });
  });

  describe('Peer-Disabled State', () => {
    it('should have peer-disabled classes', () => {
      render(<Label>Disabled Label</Label>);
      const label = screen.getByText('Disabled Label');
      expect(label).toHaveClass('peer-disabled:cursor-not-allowed', 'peer-disabled:opacity-70');
    });

    it('should work with disabled input (explicit peer class)', () => {
      render(
        <div>
          <Input disabled className="peer" id="disabled-input" placeholder="Disabled" />
          <Label htmlFor="disabled-input">Disabled Field</Label>
        </div>
      );

      const label = screen.getByText('Disabled Field');
      const input = screen.getByPlaceholderText('Disabled');

      expect(input).toBeDisabled();
      expect(label).toHaveClass('peer-disabled:opacity-70');
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via text content', () => {
      render(<Label>Accessible Label</Label>);
      expect(screen.getByText('Accessible Label')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Label aria-label="Custom label">Visual Text</Label>);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should work with screen readers (for attribute)', () => {
      render(
        <div>
          <Label htmlFor="sr-input">Screen Reader Label</Label>
          <Input id="sr-input" placeholder="SR Input" />
        </div>
      );

      const input = screen.getByPlaceholderText('SR Input');
      expect(input).toHaveAccessibleName('Screen Reader Label');
    });
  });

  describe('Custom Props', () => {
    it('should accept custom data attributes', () => {
      render(<Label data-testid="custom-label">Test</Label>);
      expect(screen.getByTestId('custom-label')).toBeInTheDocument();
    });

    it('should accept custom id', () => {
      render(<Label id="label-id">ID Label</Label>);
      const label = screen.getByText('ID Label');
      expect(label).toHaveAttribute('id', 'label-id');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to label element', () => {
      const ref = { current: null };
      render(<Label ref={ref as React.RefObject<HTMLLabelElement>}>Ref Label</Label>);
      expect(ref.current).toBeInstanceOf(HTMLLabelElement);
    });
  });

  describe('Content Types', () => {
    it('should render string content', () => {
      render(<Label>String Content</Label>);
      expect(screen.getByText('String Content')).toBeInTheDocument();
    });

    it('should render with icon', () => {
      render(
        <Label>
          <span data-testid="icon">★</span> Label with Icon
        </Label>
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Label with Icon')).toBeInTheDocument();
    });

    it('should render required indicator', () => {
      render(
        <Label>
          Email <span className="text-red-500">*</span>
        </Label>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Form Validation Integration', () => {
    it('should work with required inputs', () => {
      render(
        <div>
          <Label htmlFor="required-input">
            Required Field <span>*</span>
          </Label>
          <Input id="required-input" required placeholder="Required" />
        </div>
      );

      const label = screen.getByText('Required Field');
      const input = screen.getByPlaceholderText('Required');

      expect(label).toBeInTheDocument();
      expect(input).toBeRequired();
    });

    it('should work with invalid inputs', () => {
      render(
        <div>
          <Label htmlFor="invalid-input">Invalid Field</Label>
          <Input id="invalid-input" aria-invalid="true" placeholder="Invalid" />
        </div>
      );

      const input = screen.getByPlaceholderText('Invalid');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Multiple Inputs', () => {
    it('should support multiple labels and inputs', () => {
      render(
        <form>
          <div>
            <Label htmlFor="first">First Name</Label>
            <Input id="first" placeholder="First" />
          </div>
          <div>
            <Label htmlFor="last">Last Name</Label>
            <Input id="last" placeholder="Last" />
          </div>
        </form>
      );

      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('First')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last')).toBeInTheDocument();
    });
  });
});
