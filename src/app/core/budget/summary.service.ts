import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MonthlySummary } from './budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class SummaryService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the server-computed monthly summary for a `YYYY-MM` month. When
   * the month is omitted the backend defaults to the current business month.
   */
  async getMonthlySummary(month?: string): Promise<MonthlySummary> {
    try {
      return await firstValueFrom(
        this.http.get<MonthlySummary>(`${API_BASE}/reports/monthly-summary`, {
          params: month ? { month } : {},
        }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
