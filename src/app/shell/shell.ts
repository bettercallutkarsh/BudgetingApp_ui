import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { BrandMarkComponent } from '../shared/components/brand-mark/brand-mark';
import { NAV_ITEMS, NavItem } from '../shared/nav-items';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TablerIconComponent, BrandMarkComponent],
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class AppShellComponent {
  /**
   * Desktop sidebar destinations (six, including Profile). The mobile bottom
   * navigation reuses the first five of these; Profile is reached from the
   * dedicated button in the mobile header instead of a bottom-nav slot.
   */
  protected readonly navItems: NavItem[] = NAV_ITEMS;
  protected readonly mobileNavItems: NavItem[] = NAV_ITEMS.slice(0, 5);
  protected readonly profileItem: NavItem = NAV_ITEMS.find((item) => item.path === '/profile')!;
  protected readonly designPreviewEnabled = environment.designPreviewEnabled;
}
