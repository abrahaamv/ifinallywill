/**
 * Select Component Tests
 *
 * Tests dropdown selection, keyboard navigation, and accessibility.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../components/select';

describe('Select', () => {
  const renderSelect = () => {
    return render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
          <SelectItem value="option3">Option 3</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  describe('Rendering', () => {
    it('should render select trigger', () => {
      renderSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render placeholder', () => {
      renderSelect();
      expect(screen.getByText('Select option')).toBeInTheDocument();
    });
  });

  describe('Opening and Closing', () => {
    it('should open dropdown on trigger click', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument();
      });
    });

    it('should close dropdown on item selection', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => screen.getByText('Option 1'));

      await user.click(screen.getByText('Option 1'));

      await waitFor(() => {
        expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('should update value on item selection', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      render(
        <Select onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => screen.getByText('Option 1'));
      await user.click(screen.getByText('Option 1'));

      expect(onValueChange).toHaveBeenCalledWith('option1');
    });

    it('should support controlled value', () => {
      render(
        <Select value="option2" onValueChange={() => {}}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      );

      // Value is controlled, so Option 2 should be selected
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should support disabled trigger', () => {
      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should not open when disabled', async () => {
      const user = userEvent.setup();

      render(
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      // Content should not appear
      expect(screen.queryByText('Option 1')).not.toBeInTheDocument();
    });
  });

  describe('Grouped Options', () => {
    it('should render select groups with labels', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group 1</SelectLabel>
              <SelectItem value="item1">Item 1</SelectItem>
              <SelectItem value="item2">Item 2</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Group 2</SelectLabel>
              <SelectItem value="item3">Item 3</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Group 1')).toBeInTheDocument();
        expect(screen.getByText('Group 2')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate options with arrow keys', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));
      await waitFor(() => screen.getByText('Option 1'));

      // Arrow down should highlight next option
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Option 2')).toBeInTheDocument();
      });
    });

    it('should select on Enter', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();

      render(
        <Select onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      const trigger = screen.getByRole('combobox');
      trigger.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByText('Option 1'));
      await user.keyboard('{Enter}');

      expect(onValueChange).toHaveBeenCalledWith('option1');
    });
  });

  describe('Styling', () => {
    it('should accept custom className on trigger', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByRole('combobox')).toHaveClass('custom-trigger');
    });

    it('should accept custom className on content', async () => {
      const user = userEvent.setup();

      render(
        <Select>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="custom-content">
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const content = screen.getByText('Option 1').closest('[role="listbox"]');
        expect(content).toHaveClass('custom-content');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have combobox role', () => {
      renderSelect();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have listbox role when open', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should have option roles for items', async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options).toHaveLength(3);
      });
    });

    it('should support aria-label', () => {
      render(
        <Select>
          <SelectTrigger aria-label="Choose option">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to trigger', () => {
      const ref = { current: null };

      render(
        <Select>
          <SelectTrigger ref={ref as React.RefObject<HTMLButtonElement>}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
