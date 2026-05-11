const API_URL = process.env.EXPO_PUBLIC_API_URL;

type PaymentMethod = 'qr' | 'nfc';
type UserRole = 'passager' | 'chauffeur' | 'agent' | 'admin';

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

  const responseText = await response.text();
  let data: any = {};
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch {
    data = { error: responseText };
  }

  if (!response.ok) {
    const providerMessage =
      data?.providerResponse?.original?.data?.statusDescription ||
      data?.providerResponse?.original?.data?.description ||
      data?.providerResponse?.data?.statusDescription ||
      data?.providerResponse?.data?.description ||
      data?.providerResponse?.statusDescription ||
      data?.providerResponse?.description ||
      data?.providerResponse?.title ||
      data?.providerResponse?.message;
    throw new Error(data?.error || providerMessage || `Erreur API ${response.status}`);
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

export function getPendingUsers(role?: 'chauffeur' | 'agent') {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return requestJson(`/admin/users/pending${query}`);
}

export function approveUser(userId: string) {
  return postJson(`/admin/users/${encodeURIComponent(userId)}/approve`, {});
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

export function initiateMobileMoneyRecharge(params: {
  clientId?: string;
  amount: number;
  provider: string;
  walletId: string;
  customerFullName?: string;
  customerEmailAddress?: string;
}) {
  return postJson('/recharges/mobile-money', params);
}

export function createInternalRecharge(params: {
  clientId?: string;
  cardId?: string;
  amount: number;
  agentId?: string;
}) {
  return postJson('/admin/recharges/internal', params);
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
