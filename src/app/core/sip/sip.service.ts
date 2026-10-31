import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { toAuthApiError } from '../auth/auth.models';
import {
  SipCommitmentSummary,
  SipInstallmentListResponse,
  SipInstallmentPaymentRequest,
  SipInstallmentPaymentResponse,
  SipPlan,
  SipPlanCreateRequest,
  SipPlanListResponse,
  SipPlanStopRequest,
  SipPlanUpdateRequest,
} from './sip.models';

const API_BASE = '/api/v1/sip-plans';

@Injectable({ providedIn: 'root' })
export class SipService {
  private readonly http = inject(HttpClient);

  async createPlan(payload: SipPlanCreateRequest): Promise<SipPlan> {
    try {
      return await firstValueFrom(this.http.post<SipPlan>(API_BASE, payload));
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async listPlans(): Promise<SipPlanListResponse> {
    try {
      return await firstValueFrom(this.http.get<SipPlanListResponse>(API_BASE));
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async getPlan(id: number): Promise<SipPlan> {
    try {
      return await firstValueFrom(this.http.get<SipPlan>(`${API_BASE}/${id}`));
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async updatePlan(id: number, payload: SipPlanUpdateRequest): Promise<SipPlan> {
    try {
      return await firstValueFrom(this.http.put<SipPlan>(`${API_BASE}/${id}`, payload));
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async stopPlan(id: number, payload: SipPlanStopRequest = {}): Promise<SipPlan> {
    try {
      return await firstValueFrom(
        this.http.post<SipPlan>(`${API_BASE}/${id}/stop`, payload),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async listInstallments(
    id: number,
    fromDate?: string,
    toDate?: string,
  ): Promise<SipInstallmentListResponse> {
    let params = new HttpParams();
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    try {
      return await firstValueFrom(
        this.http.get<SipInstallmentListResponse>(
          `${API_BASE}/${id}/installments`,
          { params },
        ),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async listAllInstallments(
    fromDate?: string,
    toDate?: string,
  ): Promise<SipInstallmentListResponse> {
    let params = new HttpParams();
    if (fromDate) {
      params = params.set('fromDate', fromDate);
    }
    if (toDate) {
      params = params.set('toDate', toDate);
    }
    try {
      return await firstValueFrom(
        this.http.get<SipInstallmentListResponse>(`${API_BASE}/installments`, { params }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async markInstallmentPaid(
    id: number,
    period: string,
    payload: SipInstallmentPaymentRequest = {},
  ): Promise<SipInstallmentPaymentResponse> {
    try {
      return await firstValueFrom(
        this.http.post<SipInstallmentPaymentResponse>(
          `${API_BASE}/${id}/installments/${period}/pay`,
          payload,
        ),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }

  async getCommitmentSummary(month?: string): Promise<SipCommitmentSummary> {
    let params = new HttpParams();
    if (month) {
      params = params.set('month', month);
    }
    try {
      return await firstValueFrom(
        this.http.get<SipCommitmentSummary>(`${API_BASE}/summary`, { params }),
      );
    } catch (error) {
      throw toAuthApiError(error);
    }
  }
}
