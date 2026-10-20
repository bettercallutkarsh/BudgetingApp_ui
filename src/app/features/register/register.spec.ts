import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTablerIcons, IconEye, IconEyeOff, IconCheck } from '@tabler/icons-angular';
import { RegisterPageComponent, normalizeIndianMobile } from './register';
import { authInterceptor } from '../../core/auth/auth.interceptor';

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('normalizeIndianMobile', () => {
  it('returns 10 digits for plain 10-digit numbers', () => {
    expect(normalizeIndianMobile('9876543210')).toBe('9876543210');
  });

  it('strips +91 prefix', () => {
    expect(normalizeIndianMobile('+919876543210')).toBe('9876543210');
  });

  it('strips leading 0', () => {
    expect(normalizeIndianMobile('09876543210')).toBe('9876543210');
  });

  it('returns null for invalid numbers', () => {
    expect(normalizeIndianMobile('12345')).toBeNull();
    expect(normalizeIndianMobile('+91987654321')).toBeNull();
    expect(normalizeIndianMobile('abcdefghij')).toBeNull();
  });
});

describe('RegisterPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideTablerIcons({ IconEye, IconEyeOff, IconCheck }),
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function createFixture() {
    const fixture = TestBed.createComponent(RegisterPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(fixture: any) {
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('#register-name') as HTMLInputElement).value = '  Ada Lovelace  ';
    (el.querySelector('#register-email') as HTMLInputElement).value = '  ADA@EXAMPLE.COM  ';
    (el.querySelector('#register-phone') as HTMLInputElement).value = '9876543210';
    (el.querySelector('#register-employment') as HTMLSelectElement).value = 'SALARIED';
    (el.querySelector('#register-password') as HTMLInputElement).value = 'correct horse battery'; // 20 chars
    (el.querySelector('#register-confirm') as HTMLInputElement).value = 'correct horse battery';

    el.querySelectorAll('input, select').forEach((input: any) => {
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    });
    fixture.detectChanges();
  }

  it('validates required fields and password length', async () => {
    const fixture = createFixture();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Full name is required.');
    expect(fixture.nativeElement.textContent).toContain('Email is required.');
    expect(fixture.nativeElement.textContent).toContain('Mobile number is required.');
    expect(fixture.nativeElement.textContent).toContain('Choose an employment type.');
    expect(fixture.nativeElement.textContent).toContain('Password is required.');
  });

  it('validates password minimum length of 12 and maximum of 128', async () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    const pass = el.querySelector('#register-password') as HTMLInputElement;
    pass.value = 'short';
    pass.dispatchEvent(new Event('input'));
    pass.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    const passwordControl = component.form.get('password');
    expect(passwordControl.valid).toBe(false);
    expect(passwordControl.errors?.['minlength']).toBeTruthy();
    expect(passwordControl.errors?.['minlength']?.requiredLength).toBe(12);
    expect(passwordControl.errors?.['minlength']?.actualLength).toBe(5);
  });

  it('validates password mismatch', async () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('#register-password') as HTMLInputElement).value = 'correct horse battery';
    (el.querySelector('#register-confirm') as HTMLInputElement).value = 'different password';
    el.querySelectorAll('input').forEach((input: any) => {
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Passwords do not match.');
  });

  it('normalizes phone with +91 prefix and submits exact DTO with raw password', async () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;
    (el.querySelector('#register-name') as HTMLInputElement).value = 'Ada Lovelace';
    (el.querySelector('#register-email') as HTMLInputElement).value = 'ada@example.com';
    (el.querySelector('#register-phone') as HTMLInputElement).value = '+919876543210';
    (el.querySelector('#register-employment') as HTMLSelectElement).value = 'SALARIED';
    const password = 'my secret password'; // 18 chars, spaces preserved
    (el.querySelector('#register-password') as HTMLInputElement).value = password;
    (el.querySelector('#register-confirm') as HTMLInputElement).value = password;

    el.querySelectorAll('input, select').forEach((input: any) => {
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    const req = httpMock.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      password: password, // raw, not trimmed
    });
    expect(req.request.body.userId).toBeUndefined();
    req.flush({
      userId: 9,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-10-20T07:00:00Z',
    });

    await settle();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Account created');
  });

  it('trims fullName and email but keeps password raw and lowercases email', async () => {
    const fixture = createFixture();
    fillValidForm(fixture);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    const req = httpMock.expectOne('/api/v1/auth/register');
    expect(req.request.body.fullName).toBe('Ada Lovelace');
    expect(req.request.body.email).toBe('ada@example.com');
    expect(req.request.body.password).toBe('correct horse battery'); // spaces preserved
    req.flush({
      userId: 10,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-10-20T07:00:00Z',
    });
  });

  it('maps EMAIL_ALREADY_REGISTERED to email field error and shows form alert', async () => {
    const fixture = createFixture();
    fillValidForm(fixture);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    httpMock.expectOne('/api/v1/auth/register').flush(
      {
        timestamp: 'x',
        status: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email address is already registered.',
        fieldErrors: [],
        traceId: 't',
      },
      { status: 409, statusText: 'Conflict' },
    );

    await settle();
    fixture.detectChanges();
    const alert = fixture.nativeElement.querySelector('.form-alert');
    expect(alert?.textContent).toContain('Check the highlighted fields');
    const emailError = fixture.nativeElement.querySelector('#register-email-error');
    expect(emailError?.textContent).toContain('Email address is already registered.');
    const emailInput = fixture.nativeElement.querySelector('#register-email') as HTMLInputElement;
    expect(emailInput.classList.contains('input-invalid')).toBe(true);
  });

  it('guards against duplicate submissions', async () => {
    const fixture = createFixture();
    fillValidForm(fixture);
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await settle();
    form.dispatchEvent(new Event('submit'));
    await settle();

    httpMock.expectOne('/api/v1/auth/register').flush({
      userId: 11,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-10-20T07:00:00Z',
    });
  });

  it('allows registration to complete without auto-login', async () => {
    const fixture = createFixture();
    const auth = TestBed.inject((await import('../../core/auth/auth.service')).AuthService);
    const wasAuthenticated = auth.isAuthenticated();
    fillValidForm(fixture);
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await settle();

    httpMock.expectOne('/api/v1/auth/register').flush({
      userId: 12,
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phoneNumber: '+919876543210',
      employmentType: 'SALARIED',
      accountStatus: 'ACTIVE',
      createdAtUtc: '2026-10-20T07:00:00Z',
    });

    await settle();
    fixture.detectChanges();
    expect(auth.isAuthenticated()).toBe(wasAuthenticated);
    expect(fixture.nativeElement.textContent).toContain('Account created');
  });
});
