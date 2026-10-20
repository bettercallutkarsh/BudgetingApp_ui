import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import {
  provideTablerIcons,
  IconHome,
  IconWallet,
  IconReceipt,
  IconChartBar,
  IconUser,
  IconCreditCard,
  IconPalette,
} from '@tabler/icons-angular';
import { AppShellComponent } from './shell';

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideLocationMocks(),
        provideTablerIcons({
          IconHome,
          IconWallet,
          IconReceipt,
          IconChartBar,
          IconUser,
          IconCreditCard,
          IconPalette,
        }),
      ],
    }).compileComponents();
  });

  it('should create the shell', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the brand mark', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-brand-mark')).toBeTruthy();
  });

  it('should render the desktop sidebar with all six destinations including Profile', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const sidebarLinks = compiled.querySelectorAll('.sidebar__nav .sidebar__link');
    expect(sidebarLinks.length).toBe(6);
    expect(sidebarLinks[0].getAttribute('href')).toBe('/home');
    const hrefs = Array.from(sidebarLinks as unknown as HTMLElement[]).map((el) =>
      el.getAttribute('href'),
    );
    expect(hrefs).toContain('/credit-card');
    expect(hrefs).toContain('/profile');
  });

  it('should render exactly five mobile bottom-navigation tabs without Profile', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const bottomLinks = compiled.querySelectorAll('.bottom-nav__link');
    expect(bottomLinks.length).toBe(5);
    const hrefs = Array.from(bottomLinks as unknown as HTMLElement[]).map((el) =>
      el.getAttribute('href'),
    );
    expect(hrefs).toEqual(['/home', '/budget', '/entries', '/reports', '/credit-card']);
    expect(hrefs).not.toContain('/profile');
  });

  it('should expose a top-right Profile action in the mobile header with an accessible name', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const profileAction = compiled.querySelector(
      '.mobile-header__actions a[aria-label="Open profile"]',
    );
    expect(profileAction).toBeTruthy();
    expect(profileAction!.getAttribute('href')).toBe('/profile');
  });

  it('should render the router outlet', async () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).toBeTruthy();
  });
});
