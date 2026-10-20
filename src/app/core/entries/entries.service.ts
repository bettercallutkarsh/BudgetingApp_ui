import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  MoneyEntry,
  MoneyEntryCreateRequest,
  MoneyEntryListQuery,
  MoneyEntryPage,
} from '../budget/budget.models';
import { toAuthApiError } from '../auth/auth.models';

const API_BASE = '/api/v1';

@Injectable({ providedIn: 'root' })
export class EntriesService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches a server-paginated page of the signed-in user's money entries.
   * The backend fixes the sort order (entryAtUtc desc, then id desc) and
   * defaults to page 0, size 20 (max 100).
   */
  async listEntries(query: MoneyEntryListQuery = {}): Promise<MoneyEntryPage> {
    let params = new HttpParams();
    for (const key of [
      'fromDate',
      'toDate',
      'entryType',
      'bucket',
      'categoryCode',
      'status',
      'page',
      'size',
    ] as const) {
      const value = query[key];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    try {
      return await firstValueFrom(
        this.http.get<MoneyEntryPage>(`${API_BASE}/money-entries`, { params }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  /** Fetches a single money entry by id. */
  async getEntry(id: number): Promise<MoneyEntry> {
    try {
      return await firstValueFrom(
        this.http.get<MoneyEntry>(`${API_BASE}/money-entries/${id}`),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  /**
   * Creates a money entry. When `clientRequestId` is supplied the backend
   * deduplicates retries of the same logical operation.
   */
  async createEntry(payload: MoneyEntryCreateRequest): Promise<MoneyEntry> {
    try {
      return await firstValueFrom(
        this.http.post<MoneyEntry>(`${API_BASE}/money-entries`, payload),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  /**
   * Voids an entry. Voiding marks the entry as `VOID` and preserves its
   * history; it does not delete the record.
   */
  async voidEntry(id: number, voidReason?: string | null): Promise<MoneyEntry> {
    const body = voidReason && voidReason.trim() ? { voidReason: voidReason.trim() } : {};
    try {
      return await firstValueFrom(
        this.http.post<MoneyEntry>(`${API_BASE}/money-entries/${id}/void`, body),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
