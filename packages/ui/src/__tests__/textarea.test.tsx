/**
 * Textarea Component Tests
 *
 * Tests textarea rendering, states, interactions, and form integration.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from '../components/textarea';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter description" />);
      expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
    });

    it('should render as textarea element', () => {
      render(<Textarea placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('should have correct display name', () => {
      expect(Textarea.displayName).toBe('Textarea');
    });
  });

  describe('Sizing', () => {
    it('should have minimum height', () => {
      render(<Textarea placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveClass('min-h-[80px]');
    });

    it('should be full width by default', () => {
      render(<Textarea placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveClass('w-full');
    });

    it('should accept custom height', () => {
      render(<Textarea className="h-40" placeholder="Custom height" />);
      const textarea = screen.getByPlaceholderText('Custom height');
      expect(textarea).toHaveClass('h-40');
    });
  });

  describe('States', () => {
    it('should handle disabled state', () => {
      render(<Textarea disabled placeholder="Disabled" />);
      const textarea = screen.getByPlaceholderText('Disabled');
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    });

    it('should handle readonly state', () => {
      render(<Textarea readOnly value="Read only" onChange={() => {}} />);
      const textarea = screen.getByDisplayValue('Read only');
      expect(textarea).toHaveAttribute('readonly');
    });

    it('should handle required state', () => {
      render(<Textarea required placeholder="Required" />);
      const textarea = screen.getByPlaceholderText('Required');
      expect(textarea).toBeRequired();
    });
  });

  describe('Controlled Textarea', () => {
    it('should handle controlled value changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      const { rerender } = render(
        <Textarea value="" onChange={onChange} placeholder="Controlled" />
      );

      const textarea = screen.getByPlaceholderText('Controlled');
      await user.type(textarea, 'a');

      expect(onChange).toHaveBeenCalled();

      rerender(<Textarea value="abc" onChange={onChange} placeholder="Controlled" />);
      expect(textarea).toHaveValue('abc');
    });

    it('should handle onChange events', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<Textarea onChange={onChange} placeholder="Test" />);

      const textarea = screen.getByPlaceholderText('Test');
      await user.type(textarea, 'Hello');

      expect(onChange).toHaveBeenCalledTimes(5);
    });

    it('should pass event to onChange handler', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn((e) => e);

      render(<Textarea onChange={onChange} placeholder="Test" />);

      const textarea = screen.getByPlaceholderText('Test');
      await user.type(textarea, 'a');

      expect(onChange).toHaveBeenCalled();
      const event = onChange.mock.results[0]?.value;
      expect(event?.target.value).toBe('a');
    });
  });

  describe('Uncontrolled Textarea', () => {
    it('should handle uncontrolled textarea', async () => {
      const user = userEvent.setup();

      render(<Textarea defaultValue="Initial" placeholder="Uncontrolled" />);

      const textarea = screen.getByPlaceholderText('Uncontrolled') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial');

      await user.clear(textarea);
      await user.type(textarea, 'New value');

      expect(textarea.value).toBe('New value');
    });

    it('should support defaultValue', () => {
      render(<Textarea defaultValue="Default text" placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveValue('Default text');
    });
  });

  describe('User Interactions', () => {
    it('should accept multiline text input', async () => {
      const user = userEvent.setup();

      render(<Textarea placeholder="Type here" />);

      const textarea = screen.getByPlaceholderText('Type here') as HTMLTextAreaElement;
      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(textarea.value).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should support clearing textarea', async () => {
      const user = userEvent.setup();

      render(<Textarea defaultValue="Clear me" placeholder="Test" />);

      const textarea = screen.getByPlaceholderText('Test') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Clear me');

      await user.clear(textarea);
      expect(textarea.value).toBe('');
    });

    it('should support selecting text', async () => {
      const user = userEvent.setup();

      render(<Textarea defaultValue="Select me" placeholder="Test" />);

      const textarea = screen.getByPlaceholderText('Test') as HTMLTextAreaElement;

      await user.tripleClick(textarea);
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(9);
    });

    it('should handle paste events', async () => {
      const user = userEvent.setup();

      render(<Textarea placeholder="Paste here" />);

      const textarea = screen.getByPlaceholderText('Paste here');

      textarea.focus();
      await user.paste('Pasted content');

      expect(textarea).toHaveValue('Pasted content');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should be focusable', () => {
      render(<Textarea placeholder="Focus me" />);

      const textarea = screen.getByPlaceholderText('Focus me');
      textarea.focus();

      expect(textarea).toHaveFocus();
    });

    it('should support tab navigation', async () => {
      const user = userEvent.setup();

      render(
        <>
          <Textarea placeholder="First" />
          <Textarea placeholder="Second" />
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

      render(<Textarea defaultValue="Test content" placeholder="Test" />);

      const textarea = screen.getByPlaceholderText('Test') as HTMLTextAreaElement;
      textarea.focus();

      await user.keyboard('{Control>}a{/Control}');
      expect(textarea.selectionStart).toBe(0);
      expect(textarea.selectionEnd).toBe(12);
    });
  });

  describe('Styling', () => {
    it('should have default styling classes', () => {
      render(<Textarea placeholder="Styled" />);
      const textarea = screen.getByPlaceholderText('Styled');
      expect(textarea).toHaveClass('rounded-md', 'border', 'px-3', 'py-2', 'text-sm');
    });

    it('should accept custom className', () => {
      render(<Textarea className="custom-class" placeholder="Custom" />);
      const textarea = screen.getByPlaceholderText('Custom');
      expect(textarea).toHaveClass('custom-class');
    });

    it('should merge className with default styles', () => {
      render(<Textarea className="h-32" placeholder="Merged" />);
      const textarea = screen.getByPlaceholderText('Merged');
      expect(textarea).toHaveClass('h-32', 'rounded-md', 'border');
    });
  });

  describe('Custom Props', () => {
    it('should accept aria-label', () => {
      render(<Textarea aria-label="Custom label" />);
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });

    it('should accept aria-describedby', () => {
      render(
        <>
          <Textarea aria-describedby="helper-text" placeholder="Test" />
          <div id="helper-text">Helper text</div>
        </>
      );
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('aria-describedby', 'helper-text');
    });

    it('should accept name attribute', () => {
      render(<Textarea name="description" placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('name', 'description');
    });

    it('should accept id attribute', () => {
      render(<Textarea id="comment" placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('id', 'comment');
    });

    it('should accept rows attribute', () => {
      render(<Textarea rows={5} placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('rows', '5');
    });

    it('should accept cols attribute', () => {
      render(<Textarea cols={50} placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('cols', '50');
    });

    it('should accept maxLength attribute', () => {
      render(<Textarea maxLength={100} placeholder="Test" />);
      const textarea = screen.getByPlaceholderText('Test');
      expect(textarea).toHaveAttribute('maxLength', '100');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null };
      render(<Textarea ref={ref as React.RefObject<HTMLTextAreaElement>} placeholder="Test" />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });

    it('should allow ref manipulation', () => {
      const ref = { current: null } as React.RefObject<HTMLTextAreaElement>;
      render(<Textarea ref={ref} placeholder="Test" />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have focus-visible ring', () => {
      render(<Textarea placeholder="Focus me" />);
      const textarea = screen.getByPlaceholderText('Focus me');
      expect(textarea).toHaveClass('focus-visible:ring-2');
    });

    it('should support aria-invalid', () => {
      render(<Textarea aria-invalid="true" placeholder="Invalid" />);
      const textarea = screen.getByPlaceholderText('Invalid');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
    });

    it('should support aria-required', () => {
      render(<Textarea required aria-required="true" placeholder="Required" />);
      const textarea = screen.getByPlaceholderText('Required');
      expect(textarea).toHaveAttribute('aria-required', 'true');
    });

    it('should be keyboard accessible', () => {
      render(<Textarea placeholder="Accessible" />);
      const textarea = screen.getByPlaceholderText('Accessible');
      textarea.focus();
      expect(textarea).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work within form context', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={onSubmit}>
          <Textarea name="comment" placeholder="Comment" />
          <button type="submit">Submit</button>
        </form>
      );

      const textarea = screen.getByPlaceholderText('Comment');
      await user.type(textarea, 'Test comment');

      const button = screen.getByRole('button', { name: /submit/i });
      await user.click(button);

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should participate in form validation', () => {
      render(
        <form>
          <Textarea required placeholder="Required field" />
        </form>
      );

      const textarea = screen.getByPlaceholderText('Required field');
      expect(textarea).toBeRequired();
    });
  });

  describe('Placeholder Styling', () => {
    it('should have placeholder styling classes', () => {
      render(<Textarea placeholder="Placeholder text" />);
      const textarea = screen.getByPlaceholderText('Placeholder text');
      expect(textarea).toHaveClass('placeholder:text-muted-foreground');
    });
  });
});
