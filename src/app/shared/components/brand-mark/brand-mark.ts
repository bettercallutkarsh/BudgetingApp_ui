import { Component, input } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      [attr.aria-hidden]="ariaHidden() ? 'true' : null"
      [attr.role]="ariaHidden() ? null : 'img'"
    >
      @if (!ariaHidden()) {
        <title>Brand mark</title>
      }
      <rect x="1" y="1" width="30" height="30" rx="8" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M16 6 A10 10 0 0 1 26 16 L16 16 Z" fill="currentColor"/>
      <path d="M26 16 A10 10 0 0 1 16 26 L16 16 Z" fill="currentColor" opacity="0.55"/>
      <path d="M16 26 A10 10 0 0 1 6 16 L16 16 Z" fill="currentColor" opacity="0.3"/>
      <circle cx="16" cy="16" r="2.5" fill="var(--bg-base)"/>
      <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--brand);
    }
  `,
})
export class BrandMarkComponent {
  readonly size = input<number>(32);
  readonly ariaHidden = input<boolean>(true);
}
