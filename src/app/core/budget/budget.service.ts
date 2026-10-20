import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MonthlyBudget,
  MonthlyBudgetSaveRequest,
} from './budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the saved budget for a `YYYY-MM` month. A missing budget
   * (`BUDGET_NOT_SET`, 404) resolves to `null` so the caller can render the
   * "not set" state instead of a fake zero budget. Any other failure throws a
   * typed error.
   */
  async getBudget(month: string): Promise<MonthlyBudget | null> {
    try {
      return await firstValueFrom(
        this.http.get<MonthlyBudget>(`${API_BASE}/budgets/${month}`),
      );
    } catch (error) {
      const apiError = toAuthApiError(error);
      if (apiError.status === 404 && apiError.code === 'BUDGET_NOT_SET') {
        return null;
      }
      throw apiError;
    }
  }

  /**
   * Creates or replaces the budget for a `YYYY-MM` month. The server is
   * authoritative for all derived amounts and allocation rules.
   */
  async saveBudget(
    month: string,
    payload: MonthlyBudgetSaveRequest,
  ): Promise<MonthlyBudget> {
    try {
      return await firstValueFrom(
        this.http.put<MonthlyBudget>(`${API_BASE}/budgets/${month}`, payload),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
