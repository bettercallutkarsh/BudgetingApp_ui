import { TestBed } from '@angular/core/testing';
import { MonthSelectorComponent } from './month-selector';

describe('MonthSelectorComponent', () => {
  function create(monthLabel = 'October 2026', nextDisabled = false) {
    const fixture = TestBed.createComponent(MonthSelectorComponent);
    fixture.componentRef.setInput('monthLabel', monthLabel);
    fixture.componentRef.setInput('nextDisabled', nextDisabled);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MonthSelectorComponent] }).compileComponents();
  });

  it('renders the provided month label', () => {
    const fixture = create('October 2026');
    const label = fixture.nativeElement.querySelector('.month-selector__label') as HTMLElement;
    expect(label.textContent?.trim()).toBe('October 2026');
  });

  it('emits -1 for previous and +1 for next', () => {
    const fixture = create();
    const emitted: number[] = [];
    fixture.componentInstance.change.subscribe((delta) => emitted.push(delta));

    const buttons = fixture.nativeElement.querySelectorAll(
      '.month-selector__btn',
    ) as unknown as HTMLButtonElement[];
    buttons[0].click();
    buttons[1].click();

    expect(emitted).toEqual([-1, 1]);
  });

  it('exposes accessible names on both controls', () => {
    const fixture = create();
    const buttons = fixture.nativeElement.querySelectorAll(
      '.month-selector__btn',
    ) as unknown as HTMLButtonElement[];
    expect(buttons[0].getAttribute('aria-label')).toBe('Previous month');
    expect(buttons[1].getAttribute('aria-label')).toBe('Next month');
  });

  it('disables the next control when nextDisabled is set', () => {
    const fixture = create('October 2026', true);
    const buttons = fixture.nativeElement.querySelectorAll(
      '.month-selector__btn',
    ) as unknown as HTMLButtonElement[];
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
  });
});
