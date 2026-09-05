const API_URL = process.env.EXPO_PUBLIC_API_URL;

type PaymentMethod = 'qr' | 'nfc';
type UserRole = 'passager' | 'chauffeur' | 'agent' | 'admin';

export type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  imageUrl: string;
  status: 'draft' | 'published' | 'archived';
  publishStart?: string | null;
  publishEnd?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

async function requestJson(path: string, options: RequestInit = {}) {
  if (!API_URL) {
    throw new Error('Serveur API non configuré. Vérifiez EXPO_PUBLIC_API_URL.');
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

export function verifyVerificationCode(contact: string, code: string, purpose: 'register' | 'reset') {
  return postJson('/auth/verify-code', {
    contact,
    code,
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

export function verifyAdminLoginTwoFactor(contact: string, code: string) {
  return postJson('/auth/admin-login-verify', { contact, code });
}

export function validateAdminSession(sessionToken: string) {
  return postJson('/auth/admin-session', {
    sessionToken,
  });
}

export function getAdminSecurity(sessionToken: string) {
  return postJson('/admin/security', { sessionToken });
}

export function requestAdminTwoFactorSetup(sessionToken: string) {
  return postJson('/admin/2fa/request', { sessionToken });
}

export function verifyAdminTwoFactorSetup(sessionToken: string, contact: string, code: string) {
  return postJson('/admin/2fa/verify', { sessionToken, contact, code });
}

export function getAdminProfile(sessionToken: string) {
  return postJson('/admin/profile', { sessionToken });
}

export function updateAdminProfile(sessionToken: string, profile: {
  fullName: string; email: string; phone: string; photoUrl: string;
  companyName: string; businessSector: string; country: string; city: string;
}) {
  return postJson('/admin/profile/update', { sessionToken, ...profile });
}

export function getAdminAccounts(sessionToken: string) {
  return postJson('/admin/accounts/list', { sessionToken });
}

export function createAdminAccount(sessionToken: string, account: {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  password: string;
  status: 'Actif' | 'Désactivé';
}) {
  return postJson('/admin/accounts/create', { sessionToken, ...account });
}

export function updateAdminAccount(sessionToken: string, accountId: string, changes: {
  fullName?: string;
  role?: string;
  status?: 'Actif' | 'Désactivé';
  password?: string;
}) {
  return postJson('/admin/accounts/update', { sessionToken, accountId, ...changes });
}

export function deleteAdminAccount(sessionToken: string, accountId: string) {
  return postJson('/admin/accounts/delete', { sessionToken, accountId });
}

export function getAdminDashboard(sessionToken: string, period: 'day' | 'week' | 'month') {
  return postJson('/admin/dashboard', {
    sessionToken,
    period,
  });
}

export function getAdminClients(params: {
  sessionToken: string;
  search?: string;
  status?: string;
  cardFilter?: 'with' | 'without' | '';
  page?: number;
}) {
  return postJson('/admin/clients/list', params);
}

export function getAdminNfcCards(params: {
  sessionToken: string;
  search?: string;
  status?: string;
  activationDate?: string;
  page?: number;
}) {
  return postJson('/admin/nfc-cards/list', params);
}

export function enrollAdminNfcCard(sessionToken: string, clientId: string, cardId: string) {
  return postJson('/admin/nfc-cards/enroll', { sessionToken, clientId, cardId });
}

export function updateAdminNfcCardStatus(sessionToken: string, cardId: string, blocked: boolean) {
  return postJson('/admin/nfc-cards/status', { sessionToken, cardId, blocked });
}

export function updateClientStatus(clientId: string, sessionToken: string, status: 'active' | 'blocked' | 'closed') {
  return postJson(`/admin/clients/${encodeURIComponent(clientId)}/status`, {
    sessionToken,
    status,
  });
}

export function getAdminDrivers(params: {
  sessionToken: string;
  search?: string;
  status?: string;
  zone?: string;
  page?: number;
}) {
  return postJson('/admin/drivers/list', params);
}

export function updateDriverStatus(
  driverId: string,
  sessionToken: string,
  status: 'active' | 'pending' | 'suspended' | 'blocked' | 'refused' | 'closed',
) {
  return postJson(`/admin/drivers/${encodeURIComponent(driverId)}/status`, { sessionToken, status });
}

export function updateDriverByAdmin(
  driverId: string,
  params: {
    sessionToken: string;
    fullName: string;
    email: string;
    phone: string;
    vehicle: string;
    busPlate: string;
    route: string;
  },
) {
  return postJson(`/admin/drivers/${encodeURIComponent(driverId)}/update`, params);
}

export function getAdminAgents(params: {
  sessionToken: string;
  search?: string;
  status?: string;
  zone?: string;
  agentRole?: string;
  manager?: string;
  page?: number;
}) {
  return postJson('/admin/agents/list', params);
}

export function updateAgentStatus(
  agentId: string,
  sessionToken: string,
  status: 'active' | 'pending' | 'inactive' | 'blocked' | 'closed',
) {
  return postJson(`/admin/agents/${encodeURIComponent(agentId)}/status`, { sessionToken, status });
}

export function updateAgentByAdmin(
  agentId: string,
  params: {
    sessionToken: string;
    fullName: string;
    email: string;
    phone: string;
    assignmentZone: string;
    managerName: string;
    agentRole: string;
  },
) {
  return postJson(`/admin/agents/${encodeURIComponent(agentId)}/update`, params);
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

export function getClientProfile(clientId: string, email?: string, phone?: string) {
  return postJson('/clients/profile', { clientId, email, phone });
}

export function updateClientByAdmin(
  clientId: string,
  params: {
    fullName: string;
    email: string;
    phone: string;
    birthDate: string;
  },
) {
  return postJson(`/admin/clients/${encodeURIComponent(clientId)}/update`, params);
}

export function getPendingUsers(role?: 'chauffeur' | 'agent') {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return requestJson(`/admin/users/pending${query}`);
}

export function approveUser(userId: string) {
  return postJson(`/admin/users/${encodeURIComponent(userId)}/approve`, {});
}

export function rechargeAgent(agentId: string, amount: number, sessionToken: string) {
  return postJson(`/admin/agents/${encodeURIComponent(agentId)}/recharge`, {
    amount,
    sessionToken,
  });
}

export function getAgentAccount(agentId: string) {
  return requestJson(`/agents/${encodeURIComponent(agentId)}`);
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

export function requestPrepaidCardCode(phone: string) {
  return postJson('/prepaid-cards/request-code', {
    phone,
  });
}

export function activatePrepaidCard(params: {
  phone: string;
  code: string;
  cardId: string;
  operatorId?: string;
}) {
  return postJson('/prepaid-cards/activate', params);
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

export function recordBusinessEvent(params: {
  eventType: 'booking' | 'car_rental' | 'cancellation' | 'withdrawal';
  userId?: string;
  userName?: string;
  amount?: number;
  details?: string;
}) {
  return postJson('/business-events', params);
}

export function getPayments(clientId?: string) {
  const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
  return requestJson(`/payments${query}`);
}

export function getNotifications(clientId: string) {
  return requestJson(`/notifications?clientId=${encodeURIComponent(clientId)}`);
}

export function getPublishedNews() {
  return requestJson('/news');
}

export function getAdminNews(sessionToken: string) {
  return postJson('/admin/news/list', { sessionToken });
}

export function saveAdminNews(sessionToken: string, item: Partial<NewsItem>) {
  return postJson('/admin/news/save', { sessionToken, ...item });
}

export function deleteAdminNews(sessionToken: string, id: string) {
  return postJson('/admin/news/delete', { sessionToken, id });
}

export function getAdminServerActivity(sessionToken: string, limit = 30) {
  return postJson('/admin/activity/list', { sessionToken, limit });
}

export function markAdminServerActivityRead(sessionToken: string) {
  return postJson('/admin/activity/read', { sessionToken });
}
