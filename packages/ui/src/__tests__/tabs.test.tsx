/**
 * Tabs Component Tests
 *
 * Tests tab navigation, content switching, keyboard support, and accessibility.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/tabs';

describe('Tabs', () => {
  const renderTabs = () => {
    return render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
        <TabsContent value="tab3">Content 3</TabsContent>
      </Tabs>
    );
  };

  describe('Rendering', () => {
    it('should render tabs with triggers', () => {
      renderTabs();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('should render tablist', () => {
      renderTabs();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should render initial content', () => {
      renderTabs();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('should hide inactive content initially', () => {
      renderTabs();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('should switch content on tab click', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(screen.getByText('Content 2')).toBeVisible();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should switch to third tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      await user.click(tab3);

      expect(screen.getByText('Content 3')).toBeVisible();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('should show only one content panel at a time', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      const visibleContent = screen.getAllByRole('tabpanel', { hidden: false });
      expect(visibleContent).toHaveLength(1);
    });
  });

  describe('Active State', () => {
    it('should mark first tab as active by default', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('data-state', 'active');
    });

    it('should mark clicked tab as active', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(tab2).toHaveAttribute('data-state', 'active');
    });

    it('should remove active state from previous tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      await user.click(tab2);

      expect(tab1).toHaveAttribute('data-state', 'inactive');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with Arrow keys', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowRight}');
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveFocus();
    });

    it('should activate tab on Enter', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByText('Content 2')).toBeVisible();
    });

    it('should be focusable', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();
      expect(tab1).toHaveFocus();
    });
  });

  describe('Disabled Tabs', () => {
    it('should support disabled tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toBeDisabled();
    });

    it('should not switch to disabled tab', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2" disabled>
              Tab 2
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(screen.getByText('Content 1')).toBeVisible();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('Controlled Tabs', () => {
    it('should support controlled value', () => {
      render(
        <Tabs value="tab2" onValueChange={() => {}}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeVisible();
    });
  });

  describe('Styling', () => {
    it('should have TabsList default styling', () => {
      renderTabs();
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('inline-flex', 'h-10', 'rounded-md', 'bg-muted');
    });

    it('should have TabsTrigger default styling', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveClass('inline-flex', 'rounded-sm', 'px-3', 'py-1.5');
    });

    it('should have active tab styling', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveClass('data-[state=active]:bg-background');
    });

    it('should accept custom className on TabsList', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list">
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('custom-list');
    });

    it('should accept custom className on TabsTrigger', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" className="custom-trigger">
              Tab 1
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveClass('custom-trigger');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      renderTabs();
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should have aria-selected on active tab', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-selected', 'true');
    });

    it('should have aria-controls', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-controls');
    });

    it('should have focus-visible ring', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Content Rendering', () => {
    it('should render complex content', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <div>
              <h2>Title 1</h2>
              <p>Paragraph 1</p>
            </div>
          </TabsContent>
          <TabsContent value="tab2">
            <div>
              <h2>Title 2</h2>
              <p>Paragraph 2</p>
            </div>
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByText('Title 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(screen.getByText('Title 2')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Display Names', () => {
    it('should have correct display names', () => {
      expect(TabsList.displayName).toBe('TabsList');
      expect(TabsTrigger.displayName).toBe('TabsTrigger');
      expect(TabsContent.displayName).toBe('TabsContent');
    });
  });
});
