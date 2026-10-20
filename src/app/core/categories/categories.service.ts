import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BudgetBucket, CategoryRef, EntryType } from '../budget/budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the backend category catalogue. The catalogue is the source of
   * truth; callers must not fall back to hardcoded categories on failure.
   * Results can be narrowed server-side by entry type and/or bucket.
   */
  async listCategories(filter: {
    entryType?: EntryType;
    bucket?: BudgetBucket;
  } = {}): Promise<CategoryRef[]> {
    let params = new HttpParams();
    if (filter.entryType) {
      params = params.set('entryType', filter.entryType);
    }
    if (filter.bucket) {
      params = params.set('bucket', filter.bucket);
    }
    try {
      return await firstValueFrom(
        this.http.get<CategoryRef[]>(`${API_BASE}/reference-data/categories`, { params }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
