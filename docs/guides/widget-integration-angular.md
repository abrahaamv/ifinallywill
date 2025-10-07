# Widget SDK - Angular Integration Guide

Complete guide for integrating the Platform Widget SDK into Angular applications.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [TypeScript Support](#typescript-support)
- [Service Integration](#service-integration)
- [Dependency Injection](#dependency-injection)
- [RxJS Integration](#rxjs-integration)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Installation

### NPM

```bash
npm install @platform/widget-sdk
```

### Yarn

```bash
yarn add @platform/widget-sdk
```

### pnpm

```bash
pnpm add @platform/widget-sdk
```

## Basic Usage

### Component Integration

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

@Component({
  selector: 'app-widget',
  template: '<div id="widget-container"></div>',
  styles: ['#widget-container { width: 100%; height: 100%; }']
})
export class WidgetComponent implements OnInit, OnDestroy {
  private widget?: PlatformWidget;

  ngOnInit(): void {
    const config: WidgetConfig = {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
      primaryColor: '#6366f1',
      title: 'AI Assistant',
    };

    this.widget = new PlatformWidget('widget-container', config);
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }
}
```

### Standalone Component

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

@Component({
  selector: 'app-widget',
  standalone: true,
  imports: [CommonModule],
  template: '<div id="widget-container"></div>',
})
export class WidgetComponent implements OnInit, OnDestroy {
  private widget?: PlatformWidget;

  ngOnInit(): void {
    const config: WidgetConfig = {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    };

    this.widget = new PlatformWidget('widget-container', config);
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }
}
```

## TypeScript Support

### Strongly Typed Component

```typescript
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import type {
  WidgetConfig,
  Message,
  WidgetAPI,
} from '@platform/widget-sdk';
import { PlatformWidget } from '@platform/widget-sdk';

@Component({
  selector: 'app-configurable-widget',
  template: '<div [id]="containerId"></div>',
})
export class ConfigurableWidgetComponent implements OnInit, OnDestroy {
  @Input() apiKey!: string;
  @Input() tenantId!: string;
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';
  @Input() theme: 'light' | 'dark' | 'auto' = 'auto';
  @Input() primaryColor: string = '#6366f1';

  private widget?: PlatformWidget;
  protected containerId = `widget-${Date.now()}`;

  ngOnInit(): void {
    if (!this.apiKey || !this.tenantId) {
      throw new Error('apiKey and tenantId are required');
    }

    const config: WidgetConfig = {
      apiKey: this.apiKey,
      tenantId: this.tenantId,
      position: this.position,
      theme: this.theme,
      primaryColor: this.primaryColor,
    };

    this.widget = new PlatformWidget(this.containerId, config);
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }

  public open(): void {
    this.widget?.open();
  }

  public close(): void {
    this.widget?.close();
  }

  public isOpen(): boolean {
    return this.widget?.isOpen() ?? false;
  }
}
```

## Service Integration

### Widget Service

Create a centralized service for widget management:

```typescript
// services/widget.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig, WidgetAPI } from '@platform/widget-sdk';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WidgetService implements OnDestroy {
  private widget?: PlatformWidget;
  private widgetStateSubject = new BehaviorSubject<boolean>(false);
  public widgetState$: Observable<boolean> = this.widgetStateSubject.asObservable();

  private configSubject = new BehaviorSubject<Partial<WidgetConfig>>({});
  public config$: Observable<Partial<WidgetConfig>> = this.configSubject.asObservable();

  initialize(config: WidgetConfig): void {
    if (this.widget) {
      console.warn('Widget already initialized');
      return;
    }

    this.widget = new PlatformWidget('global-widget-container', config);
    this.configSubject.next(config);
  }

  open(): void {
    this.widget?.open();
    this.widgetStateSubject.next(true);
  }

  close(): void {
    this.widget?.close();
    this.widgetStateSubject.next(false);
  }

  toggle(): void {
    if (this.widget?.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  isOpen(): boolean {
    return this.widget?.isOpen() ?? false;
  }

  updateConfig(config: Partial<WidgetConfig>): void {
    this.widget?.updateConfig(config);
    const currentConfig = this.configSubject.value;
    this.configSubject.next({ ...currentConfig, ...config });
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
    this.widgetStateSubject.complete();
    this.configSubject.complete();
  }
}
```

### Component Using Service

```typescript
import { Component, OnInit } from '@angular/core';
import { WidgetService } from './services/widget.service';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>My Angular Application</h1>

      <div class="controls">
        <button (click)="openWidget()">Open Assistant</button>
        <button (click)="closeWidget()">Close Assistant</button>
        <button (click)="toggleWidget()">Toggle Assistant</button>
      </div>

      <div id="global-widget-container"></div>

      <p>Widget is {{ (widgetService.widgetState$ | async) ? 'open' : 'closed' }}</p>
    </div>
  `
})
export class AppComponent implements OnInit {
  constructor(public widgetService: WidgetService) {}

  ngOnInit(): void {
    this.widgetService.initialize({
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    });
  }

  openWidget(): void {
    this.widgetService.open();
  }

  closeWidget(): void {
    this.widgetService.close();
  }

  toggleWidget(): void {
    this.widgetService.toggle();
  }
}
```

## Dependency Injection

### InjectionToken for Configuration

```typescript
// tokens/widget-config.token.ts
import { InjectionToken } from '@angular/core';
import type { WidgetConfig } from '@platform/widget-sdk';

export const WIDGET_CONFIG = new InjectionToken<WidgetConfig>('widget.config');
```

### Providing Configuration

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { WIDGET_CONFIG } from './tokens/widget-config.token';
import type { WidgetConfig } from '@platform/widget-sdk';

const widgetConfig: WidgetConfig = {
  apiKey: 'your-api-key',
  tenantId: 'your-tenant-id',
  position: 'bottom-right',
  theme: 'auto',
  primaryColor: '#6366f1',
};

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: WIDGET_CONFIG, useValue: widgetConfig },
  ],
};
```

### Injecting Configuration

```typescript
import { Component, Inject, OnInit } from '@angular/core';
import { WIDGET_CONFIG } from './tokens/widget-config.token';
import type { WidgetConfig } from '@platform/widget-sdk';
import { PlatformWidget } from '@platform/widget-sdk';

@Component({
  selector: 'app-widget',
  template: '<div id="widget-container"></div>',
})
export class WidgetComponent implements OnInit {
  private widget?: PlatformWidget;

  constructor(@Inject(WIDGET_CONFIG) private config: WidgetConfig) {}

  ngOnInit(): void {
    this.widget = new PlatformWidget('widget-container', this.config);
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }
}
```

## RxJS Integration

### Observable-Based Widget Service

```typescript
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { PlatformWidget } from '@platform/widget-sdk';
import type { WidgetConfig } from '@platform/widget-sdk';

interface WidgetState {
  isOpen: boolean;
  isInitialized: boolean;
  config: Partial<WidgetConfig>;
}

@Injectable({
  providedIn: 'root'
})
export class RxWidgetService {
  private widget?: PlatformWidget;

  private stateSubject = new BehaviorSubject<WidgetState>({
    isOpen: false,
    isInitialized: false,
    config: {},
  });

  private eventsSubject = new Subject<{ type: string; payload?: any }>();

  public state$: Observable<WidgetState> = this.stateSubject.asObservable();
  public isOpen$: Observable<boolean> = this.state$.pipe(
    map(state => state.isOpen),
    distinctUntilChanged()
  );
  public isInitialized$: Observable<boolean> = this.state$.pipe(
    map(state => state.isInitialized),
    distinctUntilChanged()
  );
  public events$: Observable<{ type: string; payload?: any }> = this.eventsSubject.asObservable();

  initialize(config: WidgetConfig): void {
    if (this.widget) return;

    this.widget = new PlatformWidget('rx-widget-container', config);

    this.stateSubject.next({
      ...this.stateSubject.value,
      isInitialized: true,
      config,
    });

    this.eventsSubject.next({ type: 'initialized', payload: config });
  }

  open(): void {
    this.widget?.open();
    this.stateSubject.next({
      ...this.stateSubject.value,
      isOpen: true,
    });
    this.eventsSubject.next({ type: 'opened' });
  }

  close(): void {
    this.widget?.close();
    this.stateSubject.next({
      ...this.stateSubject.value,
      isOpen: false,
    });
    this.eventsSubject.next({ type: 'closed' });
  }

  updateConfig(config: Partial<WidgetConfig>): void {
    this.widget?.updateConfig(config);
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      config: { ...currentState.config, ...config },
    });
    this.eventsSubject.next({ type: 'configUpdated', payload: config });
  }

  destroy(): void {
    this.widget?.destroy();
    this.stateSubject.next({
      isOpen: false,
      isInitialized: false,
      config: {},
    });
    this.eventsSubject.next({ type: 'destroyed' });
  }
}
```

### Component Using RxJS Service

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RxWidgetService } from './services/rx-widget.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rx-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="widget-controls">
      <button (click)="open()" [disabled]="!(isInitialized$ | async)">
        Open Widget
      </button>
      <button (click)="close()" [disabled]="!(isOpen$ | async)">
        Close Widget
      </button>

      <p>Status: {{ (isOpen$ | async) ? 'Open' : 'Closed' }}</p>

      <div class="events">
        <h3>Recent Events:</h3>
        <ul>
          <li *ngFor="let event of recentEvents">
            {{ event.type }} - {{ event.timestamp | date:'short' }}
          </li>
        </ul>
      </div>
    </div>

    <div id="rx-widget-container"></div>
  `,
})
export class RxWidgetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isOpen$ = this.widgetService.isOpen$;
  isInitialized$ = this.widgetService.isInitialized$;

  recentEvents: Array<{ type: string; timestamp: Date }> = [];

  constructor(private widgetService: RxWidgetService) {}

  ngOnInit(): void {
    this.widgetService.initialize({
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    });

    // Subscribe to events
    this.widgetService.events$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.recentEvents.unshift({
          type: event.type,
          timestamp: new Date(),
        });

        // Keep only last 10 events
        if (this.recentEvents.length > 10) {
          this.recentEvents.pop();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.widgetService.destroy();
  }

  open(): void {
    this.widgetService.open();
  }

  close(): void {
    this.widgetService.close();
  }
}
```

## Performance Optimization

### Lazy Loading Module

```typescript
// widget.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetComponent } from './widget.component';
import { WidgetService } from './services/widget.service';

@NgModule({
  declarations: [WidgetComponent],
  imports: [CommonModule],
  providers: [WidgetService],
  exports: [WidgetComponent],
})
export class WidgetModule {}
```

```typescript
// app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'chat',
    loadChildren: () =>
      import('./widget/widget.module').then(m => m.WidgetModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
```

### OnPush Change Detection

```typescript
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { WidgetService } from './services/widget.service';

@Component({
  selector: 'app-optimized-widget',
  template: `
    <button (click)="toggle()">Toggle Widget</button>
    <p>Widget is {{ (widgetService.widgetState$ | async) ? 'open' : 'closed' }}</p>
    <div id="optimized-widget-container"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimize change detection
})
export class OptimizedWidgetComponent implements OnInit {
  constructor(public widgetService: WidgetService) {}

  ngOnInit(): void {
    this.widgetService.initialize({
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
      position: 'bottom-right',
      theme: 'auto',
    });
  }

  toggle(): void {
    this.widgetService.toggle();
  }
}
```

## Testing

### Unit Testing with Jasmine

```typescript
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { PlatformWidget } from '@platform/widget-sdk';
import { WidgetComponent } from './widget.component';

describe('WidgetComponent', () => {
  let component: WidgetComponent;
  let fixture: ComponentFixture<WidgetComponent>;
  let mockWidget: jasmine.SpyObj<PlatformWidget>;

  beforeEach(() => {
    mockWidget = jasmine.createSpyObj('PlatformWidget', [
      'open',
      'close',
      'destroy',
      'isOpen',
      'updateConfig',
    ]);

    spyOn<any>(window, 'PlatformWidget').and.returnValue(mockWidget);

    TestBed.configureTestingModule({
      declarations: [WidgetComponent],
    });

    fixture = TestBed.createComponent(WidgetComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize widget on ngOnInit', () => {
    component.ngOnInit();

    expect(window['PlatformWidget']).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({
        apiKey: jasmine.any(String),
        tenantId: jasmine.any(String),
      })
    );
  });

  it('should destroy widget on ngOnDestroy', () => {
    component.ngOnInit();
    component.ngOnDestroy();

    expect(mockWidget.destroy).toHaveBeenCalled();
  });

  it('should open widget when open() is called', () => {
    component.ngOnInit();
    component.open();

    expect(mockWidget.open).toHaveBeenCalled();
  });
});
```

### E2E Testing with Protractor/Playwright

```typescript
import { test, expect } from '@playwright/test';

test('angular widget opens and closes', async ({ page }) => {
  await page.goto('http://localhost:4200');

  // Click open button
  await page.click('button:has-text("Open Widget")');

  // Verify widget is visible
  const widget = page.locator('#widget-container');
  await expect(widget).toBeVisible();

  // Close widget
  await page.click('button:has-text("Close Widget")');

  // Verify widget is hidden
  await page.waitForTimeout(300);
  await expect(widget).not.toBeVisible();
});
```

## Troubleshooting

### Zone.js Issues

**Problem**: Widget events not triggering Angular change detection.

**Solution**: Use `NgZone` to run updates inside Angular zone:

```typescript
import { Component, NgZone, OnInit } from '@angular/core';
import { PlatformWidget } from '@platform/widget-sdk';

@Component({
  selector: 'app-widget',
  template: '<div id="widget-container"></div>',
})
export class WidgetComponent implements OnInit {
  private widget?: PlatformWidget;

  constructor(private ngZone: NgZone) {}

  ngOnInit(): void {
    this.widget = new PlatformWidget('widget-container', {
      apiKey: 'your-api-key',
      tenantId: 'your-tenant-id',
    });

    // Run widget operations inside Angular zone
    this.ngZone.run(() => {
      this.widget?.open();
    });
  }

  ngOnDestroy(): void {
    this.widget?.destroy();
  }
}
```

### AOT Compilation Issues

**Problem**: Errors during AOT (Ahead-of-Time) compilation.

**Solution**: Ensure proper type imports and configuration:

```typescript
import type { WidgetConfig } from '@platform/widget-sdk';

// Use type-only import for interfaces
const config: WidgetConfig = { /* ... */ };
```

## Best Practices

1. **Use Services**: Centralize widget management in services for reusability
2. **Dependency Injection**: Leverage Angular's DI system for configuration
3. **RxJS Observables**: Use observables for reactive state management
4. **Lazy Loading**: Load widget module only when needed
5. **OnPush Strategy**: Use OnPush change detection for performance
6. **Proper Cleanup**: Always destroy widget in `ngOnDestroy`
7. **Type Safety**: Use TypeScript definitions for compile-time safety
8. **Zone Awareness**: Use `NgZone` for proper change detection integration

## Additional Resources

- [Widget SDK API Reference](../reference/widget-sdk.md)
- [Angular Documentation](https://angular.io/docs)
- [RxJS Documentation](https://rxjs.dev/)

## Support

For issues or questions:
- [GitHub Issues](https://github.com/yourusername/platform/issues)
- [Documentation](https://github.com/yourusername/platform/tree/main/docs)
