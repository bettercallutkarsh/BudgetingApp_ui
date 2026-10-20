import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ReportGroupBy, ReportSummaryResponse } from '../budget/budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  async getSummary(params: {
    fromDate: string;
    toDate: string;
    groupBy: ReportGroupBy | string;
  }): Promise<ReportSummaryResponse> {
    try {
      let httpParams = new HttpParams()
        .set('fromDate', params.fromDate)
        .set('toDate', params.toDate)
        .set('groupBy', String(params.groupBy).toUpperCase());
      return await firstValueFrom(
        this.http.get<ReportSummaryResponse>(`${API_BASE}/reports/summary`, {
          params: httpParams,
        }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
