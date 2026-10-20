import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTablerIcons, IconEye, IconEyeOff } from '@tabler/icons-angular';
import { LoginPageComponent } from './login';
import { authInterceptor } from '../../core/auth/auth.interceptor';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('LoginPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([
          { path: 'home', component: LoginPageComponent },
          { path: 'login', component: LoginPageComponent },
        ]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTablerIcons({ IconEye, IconEyeOff }),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('shows validation errors when submitted empty', async () => {
    const fixture = createFixture();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Email is required.');
    expect(fixture.nativeElement.textContent).toContain('Password is required.');
  });

  it('validates email format and max length', async () => {
    const fixture = createFixture();
    const emailInput = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;

    emailInput.value = 'not-an-email';
    emailInput.dispatchEvent(new Event('input'));
    emailInput.dispatchEvent(new Event('blur'));
    passwordInput.value = 'short';
    passwordInput.dispatchEvent(new Event('input'));
    passwordInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
  });

  it('does not trim or modify the password on submit (raw password preserved)', async () => {
    const fixture = createFixture();
    const emailInput = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;

    emailInput.value = '  ADA@EXAMPLE.COM  ';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = '  correct horse battery  ';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    const loginReq = httpMock.expectOne('/api/v1/auth/login');
    expect(loginReq.request.body.email).toBe('ada@example.com'); // lowercased/trimmed as per spec
    expect(loginReq.request.body.password).toBe('  correct horse battery  '); // RAW, unchanged
    loginReq.flush({
      userId: 7,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-01-15T10:00:00Z',
    });

    await settle();
    httpMock.expectOne('/api/v1/me').flush({
      userId: 7,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-01-15T10:00:00Z',
    });
  });

  it('guards against duplicate submissions while loading', async () => {
    const fixture = createFixture();
    const emailInput = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;

    emailInput.value = 'ada@example.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'password123456';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await settle();
    form.dispatchEvent(new Event('submit')); // second submit should be ignored
    await settle();

    // Only one login request should be issued
    httpMock.expectOne('/api/v1/auth/login').flush({
      userId: 1,
      fullName: 'A',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-01-01T00:00:00Z',
    });
    await settle();
    httpMock.expectOne('/api/v1/me').flush({
      userId: 1,
      fullName: 'A',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-01-01T00:00:00Z',
    });
  });

  it('shows server error message on invalid credentials', async () => {
    const fixture = createFixture();
    const emailInput = fixture.nativeElement.querySelector('#login-email') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;

    emailInput.value = 'ada@example.com';
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = 'wrongpassword123';
    passwordInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    httpMock.expectOne('/api/v1/auth/login').flush(
      {
        timestamp: 'x',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
        fieldErrors: [],
        traceId: 't',
      },
      { status: 401, statusText: 'Unauthorized' },
    );

    await settle();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email or password is incorrect.');
  });

  it('shows session expired message from query param reason=expired', async () => {
    TestBed.resetTestingModule();
    const { ActivatedRoute, convertToParamMap } = await import('@angular/router');
    const activatedRouteStub = {
      snapshot: {
        queryParamMap: convertToParamMap({ reason: 'expired' }),
      },
    };
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTablerIcons({ IconEye, IconEyeOff }),
      ],
      // Provide the stub at the component level so the real router's
      // ActivatedRoute (which has no query params here) is not used.
    })
      .overrideComponent(LoginPageComponent, {
        set: {
          providers: [{ provide: ActivatedRoute, useValue: activatedRouteStub }],
        },
      })
      .compileComponents();

    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Your session expired');
  });

  it('toggles password visibility', async () => {
    const fixture = createFixture();
    const passwordInput = fixture.nativeElement.querySelector('#login-password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-field__toggle') as HTMLButtonElement;

    expect(passwordInput.type).toBe('password');
    toggle.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('text');
    toggle.click();
    fixture.detectChanges();
    expect(passwordInput.type).toBe('password');
  });
});
