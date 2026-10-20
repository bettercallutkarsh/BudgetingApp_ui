import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CreditCardOpeningRequest, CreditCardSummary } from '../budget/budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class CreditCardService {
  private readonly http = inject(HttpClient);

  async getSummary(): Promise<CreditCardSummary> {
    try {
      return await firstValueFrom(
        this.http.get<CreditCardSummary>(`${API_BASE}/credit-card/summary`),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async setOpeningOutstanding(payload: CreditCardOpeningRequest): Promise<CreditCardSummary> {
    try {
      return await firstValueFrom(
        this.http.put<CreditCardSummary>(`${API_BASE}/credit-card/opening-outstanding`, payload),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
