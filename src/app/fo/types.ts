export type Mode = "borrow" | "return";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export function umbrellaDisplayName(id: string): string {
  const match = /^umb-(\d+)$/.exec(id);
  return match ? `${match[1]}번 우산` : id;
}
