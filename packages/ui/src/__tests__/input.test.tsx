/**
 * Input Component Tests
 *
 * Tests input types, controlled/uncontrolled state, accessibility, and form integration.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from '../components/input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render with placeholder', () => {
      render(<Input placeholder="Enter your name" />);
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('should render as input element', () => {
      render(<Input placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input.tagName).toBe('INPUT');
    });

    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input');
    });
  });

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input placeholder="Text input" />);
      const input = screen.getByPlaceholderText('Text input');
      // HTML input defaults to text type even without explicit attribute
      expect(input.tagName).toBe('INPUT');
    });

    it('should render email input', () => {
      render(<Input type="email" placeholder="Email" />);
      const input = screen.getByPlaceholderText('Email');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input', () => {
      render(<Input type="password" placeholder="Password" />);
      const input = screen.getByPlaceholderText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render number input', () => {
      render(<Input type="number" placeholder="Number" />);
      const input = screen.getByPlaceholderText('Number');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render search input', () => {
      render(<Input type="search" placeholder="Search" />);
      const input = screen.getByPlaceholderText('Search');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('should render tel input', () => {
      render(<Input type="tel" placeholder="Phone" />);
      const input = screen.getByPlaceholderText('Phone');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should render url input', () => {
      render(<Input type="url" placeholder="Website" />);
      const input = screen.getByPlaceholderText('Website');
      expect(input).toHaveAttribute('type', 'url');
    });

    it('should render date input', () => {
      render(<Input type="date" aria-label="Date" />);
      const input = screen.getByLabelText('Date');
      expect(input).toHaveAttribute('type', 'date');
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Input disabled placeholder="Disabled" />);
      const input = screen.getByPlaceholderText('Disabled');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should handle readonly state', () => {
      render(<Input readOnly value="Read only" onChange={() => {}} />);
      const input = screen.getByDisplayValue('Read only');
      expect(input).toHaveAttribute('readonly');
    });

    it('should handle required state', () => {
      render(<Input required placeholder="Required" />);
      const input = screen.getByPlaceholderText('Required');
      expect(input).toBeRequired();
    });
  });

  describe('Controlled Input', () => {
    it('should handle controlled value changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <Input value="" onChange={onChange} placeholder="Controlled" />
      );

      const input = screen.getByPlaceholderText('Controlled');
      await user.type(input, 'a');

      expect(onChange).toHaveBeenCalled();

      // Simulate parent updating value
      rerender(<Input value="abc" onChange={onChange} placeholder="Controlled" />);
      expect(input).toHaveValue('abc');
    });

    it('should handle onChange events', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Input onChange={onChange} placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test');
      await user.type(input, 'Hello');

      expect(onChange).toHaveBeenCalledTimes(5); // Once per character
    });

    it('should pass event to onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn((e) => e);

      render(<Input onChange={onChange} placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test');
      await user.type(input, 'a');

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.results[0]?.value;
      expect(event?.target.value).toBe('a');
    });
  });

  describe('Uncontrolled Input', () => {
    it('should handle uncontrolled input', async () => {
      const user = userEvent.setup();

      render(<Input defaultValue="Initial" placeholder="Uncontrolled" />);

      const input = screen.getByPlaceholderText('Uncontrolled') as HTMLInputElement;
      expect(input.value).toBe('Initial');

      await user.clear(input);
      await user.type(input, 'New value');

      expect(input.value).toBe('New value');
    });

    it('should support defaultValue', () => {
      render(<Input defaultValue="Default" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveValue('Default');
    });
  });

  describe('User Interactions', () => {
    it('should accept text input', async () => {
      const user = userEvent.setup();

      render(<Input placeholder="Type here" />);

      const input = screen.getByPlaceholderText('Type here') as HTMLInputElement;
      await user.type(input, 'Hello World');

      expect(input.value).toBe('Hello World');
    });

    it('should support clearing input', async () => {
      const user = userEvent.setup();

      render(<Input defaultValue="Clear me" placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test') as HTMLInputElement;
      expect(input.value).toBe('Clear me');

      await user.clear(input);
      expect(input.value).toBe('');
    });

    it('should support selecting text', async () => {
      const user = userEvent.setup();

      render(<Input defaultValue="Select me" placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test') as HTMLInputElement;

      await user.tripleClick(input); // Select all text
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(9);
    });

    it('should handle paste events', async () => {
      const user = userEvent.setup();

      render(<Input placeholder="Paste here" />);

      const input = screen.getByPlaceholderText('Paste here');

      input.focus();
      await user.paste('Pasted content');

      expect(input).toHaveValue('Pasted content');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable', () => {
      render(<Input placeholder="Focus me" />);

      const input = screen.getByPlaceholderText('Focus me');
      input.focus();

      expect(input).toHaveFocus();
    });

    it('should support tab navigation', async () => {
      const user = userEvent.setup();

      render(
        <>
          <Input placeholder="First" />
          <Input placeholder="Second" />
        </>
      );

      const first = screen.getByPlaceholderText('First');
      const second = screen.getByPlaceholderText('Second');

      first.focus();
      expect(first).toHaveFocus();

      await user.tab();
      expect(second).toHaveFocus();
    });

    it('should support keyboard shortcuts', async () => {
      const user = userEvent.setup();

      render(<Input defaultValue="Test content" placeholder="Test" />);

      const input = screen.getByPlaceholderText('Test') as HTMLInputElement;
      input.focus();

      // Select all with Ctrl+A
      await user.keyboard('{Control>}a{/Control}');
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(12);
    });
  });

  describe('Custom Props', () => {
    it('should accept custom className', () => {
      render(<Input className="custom-class" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Input className="w-full" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveClass('w-full', 'rounded-md', 'border');
    });

    it('should accept aria-label', () => {
      render(<Input aria-label="Custom label" />);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should accept aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="helper-text" placeholder="Test" />
          <div id="helper-text">Helper text</div>
        </>
      );
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('should accept name attribute', () => {
      render(<Input name="username" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('name', 'username');
    });

    it('should accept id attribute', () => {
      render(<Input id="email-input" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('should accept min/max for number inputs', () => {
      render(<Input type="number" min={0} max={100} aria-label="Number" />);
      const input = screen.getByLabelText('Number');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
    });

    it('should accept pattern attribute', () => {
      render(<Input pattern="[0-9]{3}" placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('pattern', '[0-9]{3}');
    });

    it('should accept maxLength attribute', () => {
      render(<Input maxLength={10} placeholder="Test" />);
      const input = screen.getByPlaceholderText('Test');
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref as React.RefObject<HTMLInputElement>} placeholder="Test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow ref manipulation', () => {
      const ref = { current: null } as React.RefObject<HTMLInputElement>;
      render(<Input ref={ref} placeholder="Test" />);

      // Use ref to focus input
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have focus-visible ring', () => {
      render(<Input placeholder="Focus me" />);
      const input = screen.getByPlaceholderText('Focus me');
      expect(input).toHaveClass('focus-visible:ring-2');
    });

    it('should support aria-invalid', () => {
      render(<Input aria-invalid="true" placeholder="Invalid" />);
      const input = screen.getByPlaceholderText('Invalid');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support aria-required', () => {
      render(<Input required aria-required="true" placeholder="Required" />);
      const input = screen.getByPlaceholderText('Required');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should be keyboard accessible', () => {
      render(<Input placeholder="Accessible" />);
      const input = screen.getByPlaceholderText('Accessible');
      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work within form context', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={onSubmit}>
          <Input name="username" placeholder="Username" />
          <button type="submit">Submit</button>
        </form>
      );

      const input = screen.getByPlaceholderText('Username');
      await user.type(input, 'testuser');

      const button = screen.getByRole('button', { name: /submit/i });
      await user.click(button);

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should participate in form validation', () => {
      render(
        <form>
          <Input required type="email" placeholder="Email" />
        </form>
      );

      const input = screen.getByPlaceholderText('Email');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('type', 'email');
    });
  });

  describe('File Input Styling', () => {
    it('should have file input styling classes', () => {
      render(<Input type="file" aria-label="File upload" />);
      const input = screen.getByLabelText('File upload');
      expect(input).toHaveClass('file:border-0', 'file:bg-transparent', 'file:text-sm');
    });
  });

  describe('Placeholder Styling', () => {
    it('should have placeholder styling classes', () => {
      render(<Input placeholder="Placeholder text" />);
      const input = screen.getByPlaceholderText('Placeholder text');
      expect(input).toHaveClass('placeholder:text-muted-foreground');
    });
  });
});
