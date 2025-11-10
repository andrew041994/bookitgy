import fetch from 'node-fetch';

const token = process.env.WA_ACCESS_TOKEN!;
const phoneNumberId = process.env.WA_PHONE_NUMBER_ID!;

export async function waSend(toPhone: string, body: string) {
  const cc = process.env.WA_DEFAULT_COUNTRY_CODE || '+592';
  const to = toPhone.startsWith('+') ? toPhone : "{cc}{toPhone.replace(/^0+/, '')}" as any;

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error('WhatsApp send failed', t);
  }
}
