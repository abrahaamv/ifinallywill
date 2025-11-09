/**
 * Button Component Tests (Playwright Component Testing)
 *
 * Migration from JSDOM to Playwright for real browser testing
 */
import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from '../components/button';

test.describe('Button Component', () => {
  test('should render with default variant', async ({ mount }) => {
    const component = await mount(<Button>Click me</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Click me');
  });

  test('should render with primary variant', async ({ mount }) => {
    const component = await mount(<Button variant="default">Primary</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Primary');
  });

  test('should render with secondary variant', async ({ mount }) => {
    const component = await mount(<Button variant="secondary">Secondary</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Secondary');
  });

  test('should render with outline variant', async ({ mount }) => {
    const component = await mount(<Button variant="outline">Outline</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Outline');
  });

  test('should render with ghost variant', async ({ mount }) => {
    const component = await mount(<Button variant="ghost">Ghost</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Ghost');
  });

  test('should render with link variant', async ({ mount }) => {
    const component = await mount(<Button variant="link">Link</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Link');
  });

  test('should render with destructive variant', async ({ mount }) => {
    const component = await mount(<Button variant="destructive">Delete</Button>);
    await expect(component).toBeVisible();
    await expect(component).toContainText('Delete');
  });

  test('should render with small size', async ({ mount }) => {
    const component = await mount(<Button size="sm">Small</Button>);
    await expect(component).toBeVisible();
  });

  test('should render with default size', async ({ mount }) => {
    const component = await mount(<Button size="default">Default</Button>);
    await expect(component).toBeVisible();
  });

  test('should render with large size', async ({ mount }) => {
    const component = await mount(<Button size="lg">Large</Button>);
    await expect(component).toBeVisible();
  });

  test('should render with icon size', async ({ mount }) => {
    const component = await mount(<Button size="icon">+</Button>);
    await expect(component).toBeVisible();
  });

  test('should handle click events', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button onClick={() => { clicked = true; }}>Click me</Button>
    );

    await component.click();
    expect(clicked).toBe(true);
  });

  test('should be disabled when disabled prop is true', async ({ mount }) => {
    const component = await mount(<Button disabled>Disabled</Button>);
    await expect(component).toBeDisabled();
  });

  test('should not trigger click when disabled', async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <Button disabled onClick={() => { clicked = true; }}>Disabled</Button>
    );

    // Try to click (should not work)
    await component.click({ force: true });
    expect(clicked).toBe(false);
  });

  test('should render as child component with asChild prop', async ({ mount }) => {
    const component = await mount(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    await expect(component).toBeVisible();
    await expect(component.locator('a')).toHaveAttribute('href', '/test');
  });
});
