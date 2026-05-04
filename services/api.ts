const API_URL = process.env.EXPO_PUBLIC_API_URL;

type PaymentMethod = 'qr' | 'nfc';
type UserRole = 'passager' | 'chauffeur' | 'admin';

async function requestJson(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    return null;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `API error ${response.status}`);
  }

  return data;
}

function postJson(path: string, body: unknown) {
  return requestJson(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function requestVerificationCode(contact: string, purpose: 'register' | 'reset') {
  return postJson('/auth/request-code', {
    contact,
    purpose,
  });
}

export function registerAccount(params: {
  contact: string;
  code: string;
  fullName: string;
  birthDate: string;
  password: string;
  role: UserRole;
}) {
  return postJson('/auth/register', params);
}

export function loginAccount(login: string, password: string) {
  return postJson('/auth/login', {
    login,
    password,
  });
}

export function loginAdmin(login: string, password: string) {
  return postJson('/auth/admin-login', {
    login,
    password,
  });
}

export function resetPassword(contact: string, code: string, password: string) {
  return postJson('/auth/reset-password', {
    contact,
    code,
    password,
  });
}

export function findClientById(clientId: string) {
  return requestJson(`/admin/clients/${encodeURIComponent(clientId)}`);
}

export function saveNfcCard(clientId: string, cardId: string) {
  return postJson('/clients/nfc-card', {
    clientId,
    cardId,
  });
}

export function setNfcCardBlocked(clientId: string, blocked: boolean) {
  return postJson('/clients/nfc-card/block', {
    clientId,
    blocked,
  });
}

export function saveDriverTripSettings(params: {
  driverId?: string;
  busPlate: string;
  route: string;
  amount: number;
}) {
  return postJson('/drivers/trip-settings', params);
}

export function savePayment(
  amount: number,
  method: PaymentMethod,
  clientId?: string,
  details?: {
    driverId?: string;
    busPlate?: string;
    bus?: string;
    route?: string;
    cardId?: string;
  },
) {
  return postJson('/payments', {
    amount,
    method,
    clientId,
    ...details,
  });
}

export function getPayments(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
  return requestJson(`/payments${query}`);
}

export function getNotifications(clientId: string) {
  return requestJson(`/notifications?clientId=${encodeURIComponent(clientId)}`);
}
