import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideTablerIcons,
  IconWallet,
  IconReceipt,
  IconChartBar,
} from '@tabler/icons-angular';
import { WelcomePageComponent } from './welcome';
import { authInterceptor } from '../../core/auth/auth.interceptor';

describe('WelcomePageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTablerIcons({ IconWallet, IconReceipt, IconChartBar }),
      ],
    }).compileComponents();
  });

  it('should create the welcome page', () => {
    const fixture = TestBed.createComponent(WelcomePageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('displays the main heading about planning the month', async () => {
    const fixture = TestBed.createComponent(WelcomePageComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const h1 = fixture.nativeElement.querySelector('h1') as HTMLElement;
    expect(h1?.textContent).toContain('Plan your month');
  });

  it('has CTAs to register and login', async () => {
    const fixture = TestBed.createComponent(WelcomePageComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a');
    const hrefs = Array.from(links).map((a: any) => a.getAttribute('href'));
    expect(hrefs).toContain('/register');
    expect(hrefs).toContain('/login');
  });

  it('shows three feature cards', async () => {
    const fixture = TestBed.createComponent(WelcomePageComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    const cards = fixture.nativeElement.querySelectorAll('.feature-card');
    expect(cards.length).toBe(3);
  });
});
