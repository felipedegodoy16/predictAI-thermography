export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_expires_in: number;
}

export interface MessageResponse {
  detail: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1"
).replace(/\/+$/, "");

function describeError(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const messages = value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const record = item as { msg?: unknown; loc?: unknown };
        const field = Array.isArray(record.loc) ? record.loc.at(-1) : undefined;
        const message =
          typeof record.msg === "string" ? record.msg : "Valor inválido";
        return field ? String(field) + ": " + message : message;
      })
      .filter(Boolean);
    return messages.join(" ");
  }
  return "Não foi possível concluir a solicitação.";
}

async function request<T>(
  path: string,
  body: Record<string, string>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(API_BASE_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique se o backend está em execução.",
      0,
    );
  }

  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      result && typeof result === "object" && "detail" in result
        ? (result as { detail: unknown }).detail
        : undefined;
    const message = describeError(detail);
    if (response.status === 401) {
      throw new ApiError("E-mail ou senha incorretos.", response.status);
    }
    if (response.status === 400 && path === "/auth/reset-password") {
      throw new ApiError(
        "Este link de redefinição está inválido ou expirou. Solicite um novo link.",
        response.status,
      );
    }
    throw new ApiError(message, response.status);
  }

  return result as T;
}

export function login(payload: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", payload);
}

export function requestPasswordReset(payload: {
  email: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/forgot-password", payload);
}

export function resetPassword(payload: {
  token: string;
  newPassword: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/reset-password", {
    token: payload.token,
    nova_senha: payload.newPassword,
  });
}
