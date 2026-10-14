export async function stageApi<T>(path: string, input?: unknown): Promise<T> {
  const response = await fetch(path, input === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Could not complete this request");
  return body as T;
}
