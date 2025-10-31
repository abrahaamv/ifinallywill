/**
 * Dialog Component Tests
 *
 * Tests modal dialog rendering, interactions, accessibility, and animations.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/dialog';

describe('Dialog', () => {
  describe('Basic Rendering', () => {
    it('should render dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
        </Dialog>
      );

      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });

    it('should have correct display names', () => {
      expect(DialogHeader.displayName).toBe('DialogHeader');
      expect(DialogFooter.displayName).toBe('DialogFooter');
    });
  });

  describe('Dialog Opening', () => {
    it('should open dialog when trigger is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      const trigger = screen.getByText('Open');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Dialog Title')).toBeInTheDocument();
      });
    });

    it('should render dialog content when open', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog Closing', () => {
    it('should close dialog when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Content</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });

      // Find and click close button (X icon)
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Title')).not.toBeInTheDocument();
      });
    });

    it('should close dialog with DialogClose component', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogClose>Close</DialogClose>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByText('Title')).not.toBeInTheDocument();
      });
    });

    it('should close on Escape key', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByText('Title')).not.toBeInTheDocument();
      });
    });
  });

  describe('Dialog Composition', () => {
    it('should render complete dialog with all parts', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Action</DialogTitle>
              <DialogDescription>Are you sure you want to proceed?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Action')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });
    });

    it('should render header with title and description', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Header Title</DialogTitle>
              <DialogDescription>Header description text</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Header Title')).toBeInTheDocument();
        expect(screen.getByText('Header description text')).toBeInTheDocument();
      });
    });

    it('should render footer with actions', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter>
              <button>Action 1</button>
              <button>Action 2</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Action 1')).toBeInTheDocument();
        expect(screen.getByText('Action 2')).toBeInTheDocument();
      });
    });
  });

  describe('Controlled Dialog', () => {
    it('should support controlled open state', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();

      const { rerender } = render(
        <Dialog open={false} onOpenChange={onOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      expect(screen.queryByText('Controlled Dialog')).not.toBeInTheDocument();

      await user.click(screen.getByText('Open'));
      expect(onOpenChange).toHaveBeenCalledWith(true);

      // Simulate parent updating state
      rerender(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Controlled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await waitFor(() => {
        expect(screen.getByText('Controlled Dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Styling', () => {
    it('should accept custom className on DialogContent', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent className="custom-dialog">
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const dialog = screen.getByText('Title').closest('[role="dialog"]');
        expect(dialog).toHaveClass('custom-dialog');
      });
    });

    it('should accept custom className on DialogHeader', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogHeader className="custom-header">
              <DialogTitle>Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const header = screen.getByText('Title').parentElement;
        expect(header).toHaveClass('custom-header');
      });
    });

    it('should accept custom className on DialogFooter', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogFooter className="custom-footer">
              <button>Action</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const footer = screen.getByText('Action').parentElement;
        expect(footer).toHaveClass('custom-footer');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Accessible Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have accessible title', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const title = screen.getByText('Dialog Title');
        expect(dialog).toHaveAttribute('aria-labelledby', title.id);
      });
    });

    it('should have accessible description', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is a description</DialogDescription>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const description = screen.getByText('This is a description');
        expect(dialog).toHaveAttribute('aria-describedby', description.id);
      });
    });

    it('should have close button accessible name', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
      });
    });

    it('should trap focus inside dialog', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <button>Button 1</button>
            <button>Button 2</button>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
      });

      // Focus should be trapped inside dialog
      await user.tab();
      const button1 = screen.getByText('Button 1');
      expect(button1).toHaveFocus();
    });
  });

  describe('Common Use Cases', () => {
    it('should work as confirmation dialog', async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();

      render(
        <Dialog>
          <DialogTrigger>Delete Item</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button onClick={onConfirm}>Delete</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Delete Item'));

      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Delete'));
      expect(onConfirm).toHaveBeenCalled();
    });

    it('should work as form dialog', async () => {
      const user = userEvent.setup();

      render(
        <Dialog>
          <DialogTrigger>Add User</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Enter user details below.</DialogDescription>
            </DialogHeader>
            <input placeholder="Name" />
            <input placeholder="Email" />
            <DialogFooter>
              <DialogClose>Cancel</DialogClose>
              <button>Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Add User'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      });
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to dialog content', async () => {
      const user = userEvent.setup();
      const ref = { current: null };

      render(
        <Dialog>
          <DialogTrigger>Open</DialogTrigger>
          <DialogContent ref={ref as React.RefObject<HTMLDivElement>}>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      );

      await user.click(screen.getByText('Open'));

      await waitFor(() => {
        expect(ref.current).toBeInstanceOf(HTMLDivElement);
      });
    });
  });
});
