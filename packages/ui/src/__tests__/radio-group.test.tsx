/**
 * Radio Group Component Tests
 *
 * Tests radio button group selection, keyboard navigation, and accessibility.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Label } from '../components/label';
import { RadioGroup, RadioGroupItem } from '../components/radio-group';

describe('RadioGroup', () => {
  const renderRadioGroup = () => {
    return render(
      <RadioGroup defaultValue="option1">
        <div>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </div>
        <div>
          <RadioGroupItem value="option2" id="r2" />
          <Label htmlFor="r2">Option 2</Label>
        </div>
        <div>
          <RadioGroupItem value="option3" id="r3" />
          <Label htmlFor="r3">Option 3</Label>
        </div>
      </RadioGroup>
    );
  };

  describe('Rendering', () => {
    it('should render radio group', () => {
      renderRadioGroup();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should render radio items', () => {
      renderRadioGroup();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('should have correct display names', () => {
      expect(RadioGroup.displayName).toBe('RadioGroup');
      expect(RadioGroupItem.displayName).toBe('RadioGroupItem');
    });
  });

  describe('Selection', () => {
    it('should select first option by default', () => {
      renderRadioGroup();
      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(option1).toBeChecked();
    });

    it('should select option on click', async () => {
      const user = userEvent.setup();
      renderRadioGroup();

      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      await user.click(option2);

      expect(option2).toBeChecked();
    });

    it('should deselect previous option', async () => {
      const user = userEvent.setup();
      renderRadioGroup();

      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      const option2 = screen.getByRole('radio', { name: 'Option 2' });

      expect(option1).toBeChecked();

      await user.click(option2);

      expect(option1).not.toBeChecked();
      expect(option2).toBeChecked();
    });

    it('should call onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      render(
        <RadioGroup onValueChange={onValueChange}>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      await user.click(screen.getByRole('radio'));
      expect(onValueChange).toHaveBeenCalledWith('option1');
    });
  });

  describe('Controlled State', () => {
    it('should support controlled value', () => {
      render(
        <RadioGroup value="option2" onValueChange={() => {}}>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
          <RadioGroupItem value="option2" id="r2" />
          <Label htmlFor="r2">Option 2</Label>
        </RadioGroup>
      );

      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(option2).toBeChecked();
    });
  });

  describe('Disabled State', () => {
    it('should support disabled radio group', () => {
      render(
        <RadioGroup disabled>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      expect(screen.getByRole('radio')).toBeDisabled();
    });

    it('should support disabled individual item', () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
          <RadioGroupItem value="option2" id="r2" disabled />
          <Label htmlFor="r2">Option 2</Label>
        </RadioGroup>
      );

      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(option2).toBeDisabled();
    });

    it('should not select disabled item', async () => {
      const user = userEvent.setup();

      render(
        <RadioGroup>
          <RadioGroupItem value="option1" id="r1" disabled />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      const option = screen.getByRole('radio');
      await user.click(option);

      expect(option).not.toBeChecked();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', async () => {
      const user = userEvent.setup();
      renderRadioGroup();

      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      option1.focus();

      await user.keyboard('{ArrowDown}');

      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(option2).toHaveFocus();
      expect(option2).toBeChecked();
    });

    it('should navigate with arrow up', async () => {
      const user = userEvent.setup();
      renderRadioGroup();

      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      option2.focus();

      await user.keyboard('{ArrowUp}');

      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(option1).toHaveFocus();
    });

    it('should be focusable', () => {
      renderRadioGroup();

      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      option1.focus();

      expect(option1).toHaveFocus();
    });
  });

  describe('Form Integration', () => {
    it('should work with labels', async () => {
      const user = userEvent.setup();

      render(
        <RadioGroup>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Click me</Label>
        </RadioGroup>
      );

      await user.click(screen.getByText('Click me'));

      const radio = screen.getByRole('radio');
      expect(radio).toBeChecked();
    });

    it('should support name attribute', () => {
      render(
        <RadioGroup name="options">
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      // Radio group should exist with proper structure
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should support required attribute', () => {
      render(
        <RadioGroup required>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveAttribute('aria-required', 'true');
    });
  });

  describe('Styling', () => {
    it('should have default grid layout', () => {
      renderRadioGroup();
      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveClass('grid', 'gap-2');
    });

    it('should accept custom className on RadioGroup', () => {
      render(
        <RadioGroup className="custom-group">
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      const radiogroup = screen.getByRole('radiogroup');
      expect(radiogroup).toHaveClass('custom-group');
    });

    it('should accept custom className on RadioGroupItem', () => {
      render(
        <RadioGroup>
          <RadioGroupItem value="option1" id="r1" className="custom-item" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      const radio = screen.getByRole('radio');
      expect(radio).toHaveClass('custom-item');
    });

    it('should have focus ring', () => {
      renderRadioGroup();
      const radio = screen.getByRole('radio', { name: 'Option 1' });
      expect(radio).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Accessibility', () => {
    it('should have radiogroup role', () => {
      renderRadioGroup();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('should have radio roles', () => {
      renderRadioGroup();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('should support aria-label', () => {
      render(
        <RadioGroup aria-label="Choose option">
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
    });

    it('should have checked state', () => {
      renderRadioGroup();
      const option1 = screen.getByRole('radio', { name: 'Option 1' });
      expect(option1).toHaveAttribute('aria-checked', 'true');
    });

    it('should have unchecked state', () => {
      renderRadioGroup();
      const option2 = screen.getByRole('radio', { name: 'Option 2' });
      expect(option2).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to radio group', () => {
      const ref = { current: null };

      render(
        <RadioGroup ref={ref as React.RefObject<HTMLDivElement>}>
          <RadioGroupItem value="option1" id="r1" />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should forward ref to radio item', () => {
      const ref = { current: null };

      render(
        <RadioGroup>
          <RadioGroupItem
            ref={ref as React.RefObject<HTMLButtonElement>}
            value="option1"
            id="r1"
          />
          <Label htmlFor="r1">Option 1</Label>
        </RadioGroup>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });

  describe('Common Patterns', () => {
    it('should work as form field', () => {
      render(
        <form>
          <RadioGroup name="choice" defaultValue="yes">
            <div>
              <RadioGroupItem value="yes" id="yes" />
              <Label htmlFor="yes">Yes</Label>
            </div>
            <div>
              <RadioGroupItem value="no" id="no" />
              <Label htmlFor="no">No</Label>
            </div>
          </RadioGroup>
        </form>
      );

      expect(screen.getByRole('radio', { name: 'Yes' })).toBeChecked();
    });

    it('should work with multiple groups', () => {
      render(
        <div>
          <RadioGroup name="group1" defaultValue="a">
            <RadioGroupItem value="a" id="a" />
            <Label htmlFor="a">A</Label>
          </RadioGroup>
          <RadioGroup name="group2" defaultValue="x">
            <RadioGroupItem value="x" id="x" />
            <Label htmlFor="x">X</Label>
          </RadioGroup>
        </div>
      );

      const groups = screen.getAllByRole('radiogroup');
      expect(groups).toHaveLength(2);
    });
  });
});
