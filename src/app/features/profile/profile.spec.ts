import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  provideTablerIcons,
  IconLogout,
} from '@tabler/icons-angular';
import { ProfilePageComponent } from './profile';
import { AuthService } from '../../core/auth/auth.service';
import { authInterceptor } from '../../core/auth/auth.interceptor';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const PROFILE = {
  userId: 7,
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  phoneNumber: '+919876543210',
  employmentType: 'SALARIED' as const,
  accountStatus: 'ACTIVE' as const,
  createdAtUtc: '2026-01-15T10:00:00Z',
};

describe('ProfilePageComponent', () => {
  let httpMock: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTablerIcons({ IconLogout }),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('displays user details from AuthService', async () => {
    auth['userSignal'].set(PROFILE as any);
    auth['statusSignal'].set('authenticated');

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('ada@example.com');
    expect(text).toContain('Active');
    expect(text).toContain('+91 98765 43210');
    expect(text).toContain('Salaried');
  });

  it('shows initials avatar', async () => {
    auth['userSignal'].set(PROFILE as any);
    auth['statusSignal'].set('authenticated');

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const avatar = fixture.nativeElement.querySelector('.profile-avatar');
    expect(avatar?.textContent).toContain('AL');
  });

  it('signs out and navigates to home/welcome', async () => {
    auth['userSignal'].set(PROFILE as any);
    auth['statusSignal'].set('authenticated');
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const signOutBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) =>
      b.textContent.includes('Sign out'),
    ) as HTMLButtonElement;
    signOutBtn.click();
    await settle();

    httpMock.expectOne('/api/v1/auth/logout').flush({ message: 'Signed out successfully.' });
    await settle();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/');
    expect(auth.status()).toBe('anonymous');
    navigateSpy.mockRestore();
  });

  it('shows error when logout fails with non-auth error', async () => {
    auth['userSignal'].set(PROFILE as any);
    auth['statusSignal'].set('authenticated');

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const signOutBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) =>
      b.textContent.includes('Sign out'),
    ) as HTMLButtonElement;
    signOutBtn.click();
    await settle();

    httpMock.expectOne('/api/v1/auth/logout').flush(
      { timestamp: 'x', status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong.', fieldErrors: [], traceId: 't' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    await settle();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Something went wrong.');
    expect(auth.status()).toBe('authenticated');
  });

  it('signs out locally even if logout returns 401', async () => {
    auth['userSignal'].set(PROFILE as any);
    auth['statusSignal'].set('authenticated');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ProfilePageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const signOutBtn = Array.from(fixture.nativeElement.querySelectorAll('button')).find((b: any) =>
      b.textContent.includes('Sign out'),
    ) as HTMLButtonElement;
    signOutBtn.click();
    await settle();

    httpMock.expectOne('/api/v1/auth/logout').flush(
      { timestamp: 'x', status: 401, code: 'NOT_AUTHENTICATED', message: 'Authentication is required to access this resource.', fieldErrors: [], traceId: 't' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await settle();
    fixture.detectChanges();
    expect(auth.status()).toBe('anonymous');
  });
});
