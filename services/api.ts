const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function postJson(path: string, body: unknown) {
  if (!API_URL) {
    return null;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  return response.json();
}

export function saveNfcCard(clientId: string, cardId: string) {
  return postJson('/clients/nfc-card', {
    clientId,
    cardId,
  });
}

export function savePayment(amount: number, method: 'qr' | 'nfc', clientId?: string) {
  return postJson('/payments', {
    amount,
    method,
    clientId,
  });
}
