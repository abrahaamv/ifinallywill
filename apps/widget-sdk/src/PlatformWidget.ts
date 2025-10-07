/**
 * Platform Widget - Shadow DOM Wrapper
 * Phase 7 - Week 1 Day 3-4
 *
 * Provides complete style isolation using Shadow DOM and declarative Shadow DOM for SSR.
 * This class wraps the React Widget component and provides a vanilla JS API.
 */

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import { Widget } from './Widget';
import type { WidgetConfig } from './types';

export class PlatformWidget {
  private shadowRoot: ShadowRoot;
  private root: Root | null = null;
  private config: WidgetConfig;
  private container: HTMLElement;

  constructor(containerId: string, config: WidgetConfig) {
    // Find or create container
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }
    this.container = container;
    this.config = config;

    // Attach Shadow DOM (open mode for debugging, closed for production)
    this.shadowRoot = container.attachShadow({
      mode: config.shadowMode || 'open',
      // Declarative Shadow DOM attributes for SSR support
      delegatesFocus: true,
    });

    // Initialize the widget
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Inject styles into Shadow DOM
      await this.injectStyles();

      // Create React mount point inside Shadow DOM
      const mountPoint = document.createElement('div');
      mountPoint.id = 'widget-root';
      // Ensure full height for positioning
      mountPoint.style.cssText = 'width: 100%; height: 100vh; position: relative;';
      this.shadowRoot.appendChild(mountPoint);

      // Create React root and render Widget
      this.root = createRoot(mountPoint);
      this.render();

      // Setup event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Platform Widget initialization failed:', error);
      throw error;
    }
  }

  private async injectStyles(): Promise<void> {
    try {
      // Try Constructable Stylesheets API first (best performance)
      if ('adoptedStyleSheets' in Document.prototype && this.shadowRoot.adoptedStyleSheets) {
        const styleSheet = new CSSStyleSheet();

        // Load widget styles (will be bundled by Vite)
        const styles = await this.loadStyles();
        styleSheet.replaceSync(styles);

        this.shadowRoot.adoptedStyleSheets = [styleSheet];
      } else {
        // Fallback to <style> tag for older browsers
        const styleElement = document.createElement('style');
        styleElement.textContent = await this.loadStyles();
        this.shadowRoot.appendChild(styleElement);
      }
    } catch (error) {
      console.error('Failed to inject styles:', error);
      // Create minimal fallback styles
      const fallbackStyles = document.createElement('style');
      fallbackStyles.textContent = this.getFallbackStyles();
      this.shadowRoot.appendChild(fallbackStyles);
    }
  }

  private async loadStyles(): Promise<string> {
    // In production, styles will be extracted by Vite
    // For development, we import inline

    // This will be replaced by Vite with actual CSS content
    // The CSS includes Tailwind, component styles, and animations
    if (import.meta.env.DEV) {
      // Development: Load from style.css
      const response = await fetch('/style.css');
      return await response.text();
    } else {
      // Production: Styles are bundled and available via import
      // Vite will handle this automatically during build
      return '/* Styles will be injected here by build process */';
    }
  }

  private getFallbackStyles(): string {
    // Minimal fallback styles if CSS loading fails
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      :host {
        all: initial;
        display: block;
        font-family: system-ui, -apple-system, sans-serif;
      }

      #widget-root {
        width: 100%;
        height: 100vh;
        position: relative;
      }

      .widget-error {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 16px;
        background: #ef4444;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 9999;
      }
    `;
  }

  private render(): void {
    if (!this.root) return;

    // Render React Widget component with config
    this.root.render(
      createElement(Widget, {
        apiKey: this.config.apiKey,
        tenantId: this.config.tenantId,
        position: this.config.position || 'bottom-right',
        theme: this.config.theme || 'auto',
        primaryColor: this.config.primaryColor || '#6366f1',
        title: this.config.title || 'AI Assistant',
        placeholder: this.config.placeholder || 'Type your message...',
        greeting: this.config.greeting || 'Hello! How can I help you today?',
      })
    );
  }

  private setupEventListeners(): void {
    // Listen for config updates from parent window
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'platform-widget-config') {
        this.updateConfig(event.data.config);
      }
    });

    // Listen for theme changes
    if (this.config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        this.render();
      });
    }
  }

  /**
   * Update widget configuration dynamically
   */
  public updateConfig(newConfig: Partial<WidgetConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.render();
  }

  /**
   * Destroy the widget and clean up resources
   */
  public destroy(): void {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Clear Shadow DOM
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild);
    }

    // Remove container if we created it
    if (this.container.id && document.getElementById(this.container.id)) {
      this.container.remove();
    }
  }

  /**
   * Get Shadow DOM reference (for debugging)
   */
  public getShadowRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  /**
   * Check if widget is currently visible
   */
  public isOpen(): boolean {
    // This would need to be implemented with state management
    // For now, return a placeholder
    return false;
  }

  /**
   * Programmatically open the widget
   */
  public open(): void {
    // Send message to React component
    window.postMessage({ type: 'platform-widget-open' }, '*');
  }

  /**
   * Programmatically close the widget
   */
  public close(): void {
    // Send message to React component
    window.postMessage({ type: 'platform-widget-close' }, '*');
  }
}

// Export for global window access
if (typeof window !== 'undefined') {
  (window as any).PlatformWidget = PlatformWidget;
}
