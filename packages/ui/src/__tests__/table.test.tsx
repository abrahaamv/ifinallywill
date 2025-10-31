/**
 * Table Component Tests
 *
 * Tests data table rendering, composition, accessibility, and styling.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/table';

describe('Table', () => {
  describe('Basic Rendering', () => {
    it('should render table element', () => {
      render(
        <Table data-testid="table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByTestId('table');
      expect(table).toBeInTheDocument();
      expect(table.tagName).toBe('TABLE');
    });

    it('should render with wrapper div for overflow', () => {
      const { container } = render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const wrapper = container.querySelector('.overflow-auto');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper?.querySelector('table')).toBeInTheDocument();
    });

    it('should have correct display names', () => {
      expect(Table.displayName).toBe('Table');
      expect(TableHeader.displayName).toBe('TableHeader');
      expect(TableBody.displayName).toBe('TableBody');
      expect(TableFooter.displayName).toBe('TableFooter');
      expect(TableRow.displayName).toBe('TableRow');
      expect(TableHead.displayName).toBe('TableHead');
      expect(TableCell.displayName).toBe('TableCell');
      expect(TableCaption.displayName).toBe('TableCaption');
    });
  });

  describe('Table Composition', () => {
    it('should render complete table with all parts', () => {
      render(
        <Table>
          <TableCaption>A list of users</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>1 user</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('A list of users')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('should render header section', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Column 1</TableHead>
              <TableHead>Column 2</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const thead = screen.getByText('Column 1').closest('thead');
      expect(thead).toBeInTheDocument();
      expect(thead).toHaveClass('[&_tr]:border-b');
    });

    it('should render body section', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Data 1</TableCell>
              <TableCell>Data 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tbody = screen.getByText('Data 1').closest('tbody');
      expect(tbody).toBeInTheDocument();
      expect(tbody).toHaveClass('[&_tr:last-child]:border-0');
    });

    it('should render footer section', () => {
      render(
        <Table>
          <TableFooter>
            <TableRow>
              <TableCell>Footer 1</TableCell>
              <TableCell>Footer 2</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      const tfoot = screen.getByText('Footer 1').closest('tfoot');
      expect(tfoot).toBeInTheDocument();
      expect(tfoot).toHaveClass('border-t', 'bg-muted/50', 'font-medium');
    });
  });

  describe('TableHead', () => {
    it('should render as th element', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByText('Header');
      expect(th.tagName).toBe('TH');
    });

    it('should have default styling', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByText('Header');
      expect(th).toHaveClass('h-12', 'px-4', 'text-left', 'font-medium');
    });

    it('should accept custom className', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="custom-header">Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByText('Header');
      expect(th).toHaveClass('custom-header');
    });

    it('should support scope attribute', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Column Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const th = screen.getByText('Column Header');
      expect(th).toHaveAttribute('scope', 'col');
    });
  });

  describe('TableCell', () => {
    it('should render as td element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const td = screen.getByText('Cell');
      expect(td.tagName).toBe('TD');
    });

    it('should have default styling', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const td = screen.getByText('Cell');
      expect(td).toHaveClass('p-4', 'align-middle');
    });

    it('should accept custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="custom-cell">Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const td = screen.getByText('Cell');
      expect(td).toHaveClass('custom-cell');
    });

    it('should support colSpan', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell colSpan={2}>Spanning Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const td = screen.getByText('Spanning Cell');
      expect(td).toHaveAttribute('colSpan', '2');
    });
  });

  describe('TableRow', () => {
    it('should render as tr element', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tr = screen.getByText('Cell').closest('tr');
      expect(tr).toBeInTheDocument();
      expect(tr?.tagName).toBe('TR');
    });

    it('should have default styling', () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tr = screen.getByText('Cell').closest('tr');
      expect(tr).toHaveClass('border-b', 'transition-colors', 'hover:bg-muted/50');
    });

    it('should accept custom className', () => {
      render(
        <Table>
          <TableBody>
            <TableRow className="custom-row">
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tr = screen.getByText('Cell').closest('tr');
      expect(tr).toHaveClass('custom-row');
    });

    it('should support data-state attribute', () => {
      render(
        <Table>
          <TableBody>
            <TableRow data-state="selected">
              <TableCell>Selected Row</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tr = screen.getByText('Selected Row').closest('tr');
      expect(tr).toHaveAttribute('data-state', 'selected');
      expect(tr).toHaveClass('data-[state=selected]:bg-muted');
    });
  });

  describe('TableCaption', () => {
    it('should render as caption element', () => {
      render(
        <Table>
          <TableCaption>Table caption</TableCaption>
        </Table>
      );

      const caption = screen.getByText('Table caption');
      expect(caption.tagName).toBe('CAPTION');
    });

    it('should have default styling', () => {
      render(
        <Table>
          <TableCaption>Table caption</TableCaption>
        </Table>
      );

      const caption = screen.getByText('Table caption');
      expect(caption).toHaveClass('mt-4', 'text-sm', 'text-muted-foreground');
    });

    it('should accept custom className', () => {
      render(
        <Table>
          <TableCaption className="custom-caption">Table caption</TableCaption>
        </Table>
      );

      const caption = screen.getByText('Table caption');
      expect(caption).toHaveClass('custom-caption');
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = container.querySelector('table');
      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');
      const th = container.querySelector('th');
      const td = container.querySelector('td');

      expect(table).toBeInTheDocument();
      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
      expect(th).toBeInTheDocument();
      expect(td).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(
        <Table aria-label="User data table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByLabelText('User data table');
      expect(table).toBeInTheDocument();
    });

    it('should support caption for accessibility', () => {
      render(
        <Table>
          <TableCaption>A list of recent invoices</TableCaption>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('A list of recent invoices')).toBeInTheDocument();
    });
  });

  describe('Styling Customization', () => {
    it('should accept custom className on Table', () => {
      const { container } = render(
        <Table className="custom-table">
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = container.querySelector('table');
      expect(table).toHaveClass('custom-table');
    });

    it('should accept custom className on TableHeader', () => {
      render(
        <Table>
          <TableHeader className="custom-header">
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      const thead = screen.getByText('Header').closest('thead');
      expect(thead).toHaveClass('custom-header');
    });

    it('should accept custom className on TableBody', () => {
      render(
        <Table>
          <TableBody className="custom-body">
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const tbody = screen.getByText('Cell').closest('tbody');
      expect(tbody).toHaveClass('custom-body');
    });

    it('should accept custom className on TableFooter', () => {
      render(
        <Table>
          <TableFooter className="custom-footer">
            <TableRow>
              <TableCell>Footer</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      const tfoot = screen.getByText('Footer').closest('tfoot');
      expect(tfoot).toHaveClass('custom-footer');
    });
  });

  describe('Common Patterns', () => {
    it('should render data table with multiple rows', () => {
      const users = [
        { name: 'Alice', email: 'alice@example.com', role: 'Admin' },
        { name: 'Bob', email: 'bob@example.com', role: 'User' },
        { name: 'Charlie', email: 'charlie@example.com', role: 'User' },
      ];

      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.email}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('should render table with footer totals', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Product A</TableCell>
              <TableCell>$100</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Product B</TableCell>
              <TableCell>$200</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell>Total</TableCell>
              <TableCell>$300</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      );

      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('$300')).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to table element', () => {
      const ref = { current: null };
      render(
        <Table ref={ref as React.RefObject<HTMLTableElement>}>
          <TableBody>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableElement);
    });

    it('should forward ref to thead element', () => {
      const ref = { current: null };
      render(
        <Table>
          <TableHeader ref={ref as React.RefObject<HTMLTableSectionElement>}>
            <TableRow>
              <TableHead>Header</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
      expect((ref.current as HTMLTableSectionElement | null)?.tagName).toBe('THEAD');
    });

    it('should forward ref to tbody element', () => {
      const ref = { current: null };
      render(
        <Table>
          <TableBody ref={ref as React.RefObject<HTMLTableSectionElement>}>
            <TableRow>
              <TableCell>Cell</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
      expect((ref.current as HTMLTableSectionElement | null)?.tagName).toBe('TBODY');
    });
  });
});
