type CertDevice = {
  id: string;
  name: string;
  platform: string;
  cert_cn: string;
  issued_at: string;
  expires_at: string;
  status: string;
};

type CertRequest = {
  id: string;
  device_name: string;
  platform: string;
  note: string;
  status: string;
  requested_at: string;
  issued_at: string;
  expires_at: string;
  device_id: string;
};

type CertLink = {
  id: string;
  request_id: string;
  token: string;
  status: string;
  created_at: string;
  expires_at: string;
  note: string;
  distribution_url_path: string;
};

type AuditRecord = {
  id: string;
  at: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
};

async function parseJson(resp: Response) {
  return (await resp.json().catch(() => ({}))) as Record<string, unknown>;
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const resp = await fetch(path, { cache: "no-store" });
  const json = await parseJson(resp);
  if (!resp.ok || json.ok !== true) {
    throw new Error(String(json.error ?? `request failed: ${resp.status}`));
  }
  return json;
}

async function postJson(path: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const resp = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await parseJson(resp);
  if (!resp.ok || json.ok !== true) {
    throw new Error(String(json.error ?? `request failed: ${resp.status}`));
  }
  return json;
}

export async function listCertDevices(): Promise<CertDevice[]> {
  const json = await getJson("/api/certs/devices");
  return (json.devices as CertDevice[]) ?? [];
}

export async function listCertRequests(): Promise<CertRequest[]> {
  const json = await getJson("/api/certs/requests");
  return (json.requests as CertRequest[]) ?? [];
}

export async function createCertRequest(payload: {
  device_name: string;
  platform: string;
  note: string;
}): Promise<CertRequest> {
  const json = await postJson("/api/certs/requests", payload);
  return json.request as CertRequest;
}

export async function markCertIssued(payload: {
  request_id: string;
  issued_at: string;
  expires_at: string;
  cert_cn: string;
}): Promise<CertRequest> {
  const json = await postJson(`/api/certs/requests/${encodeURIComponent(payload.request_id)}/mark-issued`, payload);
  return json.request as CertRequest;
}

export async function listCertLinks(): Promise<CertLink[]> {
  const json = await getJson("/api/certs/links");
  return (json.links as CertLink[]) ?? [];
}

export async function createCertLink(payload: {
  request_id: string;
  expires_in_sec: number;
  note: string;
}): Promise<CertLink> {
  const json = await postJson("/api/certs/links", payload);
  return json.link as CertLink;
}

export async function revokeCertLink(link_id: string): Promise<CertLink> {
  const json = await postJson(`/api/certs/links/${encodeURIComponent(link_id)}/revoke`, {});
  return json.link as CertLink;
}

export async function listCertAudit(): Promise<AuditRecord[]> {
  const json = await getJson("/api/certs/audit");
  return (json.audit as AuditRecord[]) ?? [];
}
