/**
 * SnelStart BoekhoudAPI-client. Alleen lezend: haalt verkoop- en
 * inkoopfacturen op, schrijft nooit iets terug naar SnelStart.
 *
 * Authenticatie (drie lagen):
 *  - SNELSTART_SUBSCRIPTION_KEY: identificeert de hub als integratie,
 *    gegenereerd bij registratie op developer.snelstart.nl.
 *  - SNELSTART_CONNECTION_KEY: identificeert de administratie, door de
 *    klant zelf gegenereerd in SnelStart onder "Koppelingen en maatwerk".
 *  - Een access token wordt met deze twee sleutels opgehaald en is
 *    kort geldig; we cachen 'm in het geheugen van de serverless
 *    instance tot vlak voor het verloopt.
 *
 * LET OP: de exacte endpoint-paden en het response-formaat hieronder
 * zijn nog niet geverifieerd tegen de live documentatie (die is pas
 * zichtbaar na registratie op het SnelStart developer-portaal). Zodra
 * de sleutels beschikbaar zijn, testen en corrigeren we dit samen
 * tegen de echte API voordat de koppeling wordt aangezet.
 */

const TOKEN_URL = "https://auth.snelstart.nl/b2c/connect/token";
const API_BASE = "https://b2bapi.snelstart.nl/v2";

type TokenCache = { token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

export class SnelStartConfigError extends Error {}
export class SnelStartApiError extends Error {}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new SnelStartConfigError(`${name} ontbreekt (environment variable).`);
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const subscriptionKey = requiredEnv("SNELSTART_SUBSCRIPTION_KEY");
  const connectionKey = requiredEnv("SNELSTART_CONNECTION_KEY");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connectionKey,
    }),
  });

  if (!res.ok) {
    throw new SnelStartApiError(
      `SnelStart-token ophalen mislukt (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

async function apiGet<T>(path: string): Promise<T> {
  const subscriptionKey = requiredEnv("SNELSTART_SUBSCRIPTION_KEY");
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": subscriptionKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new SnelStartApiError(
      `SnelStart-aanroep ${path} mislukt (${res.status}): ${await res.text()}`,
    );
  }
  return res.json() as Promise<T>;
}

export type RemoteSalesInvoice = {
  id: string;
  factuurnummer: string | null;
  klantnaam: string | null;
  bedrag: number | null;
  status: string | null;
  factuurdatum: string | null;
  betaaldatum: string | null;
  raw: unknown;
};

export type RemotePurchaseInvoice = {
  id: string;
  factuurnummer: string | null;
  leverancienaam: string | null;
  bedrag: number | null;
  status: string | null;
  factuurdatum: string | null;
  betaaldatum: string | null;
  raw: unknown;
};

/** Verkoopfacturen (naar klanten) sinds een datum, meest recent eerst. */
export async function fetchSalesInvoicesSince(
  since: string,
): Promise<RemoteSalesInvoice[]> {
  const data = await apiGet<{ items: Record<string, unknown>[] }>(
    `/verkoopfacturen?vanaf=${encodeURIComponent(since)}`,
  );
  return (data.items ?? []).map((item) => ({
    id: String(item.id),
    factuurnummer: (item.factuurnummer as string) ?? null,
    klantnaam: (item.klantnaam as string) ?? null,
    bedrag: (item.bedrag as number) ?? null,
    status: (item.status as string) ?? null,
    factuurdatum: (item.factuurdatum as string) ?? null,
    betaaldatum: (item.betaaldatum as string) ?? null,
    raw: item,
  }));
}

/** Inkoopfacturen (van leveranciers/partners) sinds een datum. */
export async function fetchPurchaseInvoicesSince(
  since: string,
): Promise<RemotePurchaseInvoice[]> {
  const data = await apiGet<{ items: Record<string, unknown>[] }>(
    `/inkoopfacturen?vanaf=${encodeURIComponent(since)}`,
  );
  return (data.items ?? []).map((item) => ({
    id: String(item.id),
    factuurnummer: (item.factuurnummer as string) ?? null,
    leverancienaam: (item.leverancienaam as string) ?? null,
    bedrag: (item.bedrag as number) ?? null,
    status: (item.status as string) ?? null,
    factuurdatum: (item.factuurdatum as string) ?? null,
    betaaldatum: (item.betaaldatum as string) ?? null,
    raw: item,
  }));
}
