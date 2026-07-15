import type { ApiCadet, Role, Attendance, AuthResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string) {
  localStorage.setItem("token", token);
}

function clearToken() {
  localStorage.removeItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${response.statusText} - ${text}`
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export async function loginUser(
  username: string,
  password: string,
  role: Role
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/Authentication/login", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function registerUser(
  username: string,
  password: string,
  role: Role
): Promise<boolean> {
  await request<void>("/api/Authentication/register", {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
  return true;
}

export async function logoutUser(): Promise<void> {
  return request<void>("/api/Authentication/logout", {
    method: "POST",
  });
}

export async function fetchCadets(): Promise<ApiCadet[]> {
  return request<ApiCadet[]>("/api/Cadets/cadets");
}

export async function fetchAttendance(): Promise<Attendance[]> {
  return request<Attendance[]>("/api/Attendance/attendance");
}

export async function deleteAttendance(id: string | number): Promise<void> {
  return request<void>(`/api/Attendance/attendance/${id}`, {
    method: "DELETE",
  });
}

export async function fetchReport(): Promise<{ weeklySummary: string; pendingReview: number; exportReady: number }> {
  return request<{ weeklySummary: string; pendingReview: number; exportReady: number }>("/api/Attendance/report");
}

export async function createAttendance(
  attendance: Omit<Attendance, "id">
): Promise<Attendance> {
  return request<Attendance>("/api/Attendance/attendance", {
    method: "POST",
    body: JSON.stringify(attendance),
  });
}

export async function updateAttendance(
  id: string | number,
  attendance: Omit<Attendance, "id">
): Promise<Attendance> {
  return request<Attendance>(`/api/Attendance/attendance/${id}`, {
    method: "PUT",
    body: JSON.stringify(attendance),
  });
}

export { setToken, clearToken };
