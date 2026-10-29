import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
  type AuthSession,
} from "@/lib/auth-session";

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

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  role: "user" | "admin";
}

export interface UserOption {
  id: string;
  name: string;
  email: string;
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  role?: "user" | "admin";
}

export interface UserCreateInput extends UserUpdateInput {
  name: string;
  email: string;
  password: string;
  role: "user" | "admin";
}

export type ServiceOrderStatus =
  | "BACKLOG"
  | "EM_ANDAMENTO"
  | "AGUARDANDO_PECA"
  | "EM_REVISAO"
  | "CONCLUIDO"
  | "CANCELADO";

export type ServiceOrderPriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export interface ChecklistItem {
  id: number;
  serviceOrderId: number;
  description: string;
  required: boolean;
  completed: boolean;
  technicianNote: string | null;
  completedAt: string | null;
  sortOrder: number;
}

export interface ServiceOrder {
  id: number;
  code: string;
  title: string;
  description: string;
  status: ServiceOrderStatus;
  priority: ServiceOrderPriority;
  clientId: string;
  equipmentId: number | null;
  technicianId: string | null;
  createdAt: string;
  dueAt: string | null;
  completedAt: string | null;
  statusNote: string | null;
  checklistItems: ChecklistItem[];
}

export interface ChecklistItemInput {
  description: string;
  required: boolean;
  sortOrder: number;
}

export interface ServiceOrderInput {
  title: string;
  description: string;
  priority: ServiceOrderPriority;
  clientId: string;
  equipmentId?: number;
  technicianId?: string;
  dueAt?: string;
  checklistItems: ChecklistItemInput[];
}

export interface EquipmentAdvice {
  title: string;
  description: string;
  priority: ServiceOrderPriority;
  checklistItems: ChecklistItemInput[];
}

export type EquipmentType =
  | "MOTOR_ELETRICO"
  | "BOMBA"
  | "PAINEL_ELETRICO"
  | "COMPRESSOR"
  | "OUTRO";

export type EquipmentCriticality = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export interface EquipmentFieldOption {
  key: string;
  label: string;
  unit: string;
}

export interface EquipmentTypeOption {
  equipmentType: EquipmentType;
  label: string;
  fields: EquipmentFieldOption[];
}

export interface Equipment {
  id: number;
  code: string;
  name: string;
  equipmentType: EquipmentType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  assetTag: string | null;
  location: string | null;
  criticality: EquipmentCriticality;
  installationDate: string | null;
  notes: string | null;
  specifications: Record<string, number>;
  createdAt: string;
  manualFileName: string | null;
}

export interface EquipmentInput {
  name: string;
  equipmentType: EquipmentType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  assetTag?: string;
  location?: string;
  criticality: EquipmentCriticality;
  installationDate?: string;
  notes?: string;
  specifications: Record<string, number>;
}

export interface DashboardMonthActivity {
  month: string;
  opened: number;
  completed: number;
}

export interface DashboardSummary {
  openOrders: number;
  closedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  overdueOrders: number;
  byStatus: Record<ServiceOrderStatus, number>;
  byPriority: Record<ServiceOrderPriority, number>;
  monthlyActivity: DashboardMonthActivity[];
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

let refreshInFlight: Promise<AuthSession | null> | null = null;

function refreshAuthSession(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAuthSessionOnce().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function refreshAuthSessionOnce(): Promise<AuthSession | null> {
  const session = getAuthSession();
  if (!session?.refresh_token) return null;

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + "/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API para renovar sua sessão. Tente novamente.",
      0,
    );
  }

  if (response.status === 401) {
    clearAuthSession();
    return null;
  }
  if (!response.ok) {
    throw new ApiError(
      "Não foi possível renovar sua sessão. Tente novamente.",
      response.status,
    );
  }

  const tokens = (await response.json().catch(() => null)) as TokenResponse | null;
  if (!tokens?.access_token || !tokens.refresh_token) {
    throw new ApiError("A API retornou uma resposta de sessão inválida.", 500);
  }

  saveAuthSession(tokens, session.email);
  return { ...tokens, email: session.email };
}

function redirectToLogin(): void {
  clearAuthSession();
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function describeError(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!item || typeof item !== "object") return "";
        const record = item as { msg?: unknown; loc?: unknown };
        const field = Array.isArray(record.loc) ? record.loc.at(-1) : undefined;
        const message =
          typeof record.msg === "string" ? record.msg : "Valor inválido";
        return field ? String(field) + ": " + message : message;
      })
      .filter(Boolean)
      .join(" ");
  }
  return "Não foi possível concluir a solicitação.";
}

async function request<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    authenticated?: boolean;
  } = {},
): Promise<T> {
  const method = options.method ?? "POST";
  const headers = new Headers();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
  if (options.authenticated) {
    const session = getAuthSession();
    if (!session?.access_token) {
      redirectToLogin();
      throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
    }
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : isFormData ? options.body as FormData : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Não foi possível conectar à API. Verifique se o backend está em execução.",
      0,
    );
  }

  if (options.authenticated && response.status === 401 && path !== "/auth/login") {
    const refreshedSession = await refreshAuthSession();
    if (!refreshedSession) {
      redirectToLogin();
      throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
    }

    headers.set("Authorization", `Bearer ${refreshedSession.access_token}`);
    try {
      response = await fetch(API_BASE_URL + path, {
        method,
        headers,
        body: options.body === undefined ? undefined : isFormData ? options.body as FormData : JSON.stringify(options.body),
        cache: "no-store",
      });
    } catch {
      throw new ApiError(
        "Não foi possível conectar à API. Verifique se o backend está em execução.",
        0,
      );
    }

    if (response.status === 401) {
      redirectToLogin();
      throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
    }
  }

  const result: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      result && typeof result === "object" && "detail" in result
        ? (result as { detail: unknown }).detail
        : undefined;
    if (response.status === 401 && path === "/auth/login") {
      throw new ApiError("E-mail ou senha incorretos.", response.status);
    }
    if (response.status === 401) {
      throw new ApiError("Sua sessão expirou. Entre novamente.", response.status);
    }
    if (response.status === 400 && path === "/auth/reset-password") {
      throw new ApiError(
        "Este link de redefinição está inválido ou expirou. Solicite um novo link.",
        response.status,
      );
    }
    throw new ApiError(describeError(detail), response.status);
  }
  return result as T;
}

function valueOf(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function normalizeChecklistItem(value: unknown): ChecklistItem {
  const item = value as Record<string, unknown>;
  return {
    id: Number(item.id),
    serviceOrderId: Number(valueOf(item, "ordem_servico_id", "service_order_id")),
    description: String(valueOf(item, "descricao", "description") ?? ""),
    required: Boolean(valueOf(item, "obrigatorio", "required")),
    completed: Boolean(valueOf(item, "concluido", "completed")),
    technicianNote:
      (valueOf(item, "observacao_tecnico", "technician_note") as string | null) ??
      null,
    completedAt:
      (valueOf(item, "data_conclusao_item", "item_completed_at") as string | null) ??
      null,
    sortOrder: Number(valueOf(item, "ordem", "sort_order") ?? 0),
  };
}

function normalizeServiceOrder(value: unknown): ServiceOrder {
  const order = value as Record<string, unknown>;
  const checklist = valueOf(order, "checklist_itens", "checklist_items");
  return {
    id: Number(order.id),
    code: String(valueOf(order, "codigo_os", "code") ?? ""),
    title: String(valueOf(order, "titulo", "title") ?? ""),
    description: String(valueOf(order, "descricao", "description") ?? ""),
    status: String(order.status) as ServiceOrderStatus,
    priority: String(valueOf(order, "prioridade", "priority")) as ServiceOrderPriority,
    clientId: String(valueOf(order, "cliente_id", "client_id") ?? ""),
    equipmentId: (valueOf(order, "equipamento_id", "equipment_id") as number | null) ?? null,
    technicianId:
      (valueOf(order, "tecnico_id", "technician_id") as string | null) ?? null,
    createdAt: String(valueOf(order, "data_criacao", "created_at") ?? ""),
    dueAt: (valueOf(order, "data_previsao", "due_at") as string | null) ?? null,
    completedAt:
      (valueOf(order, "data_conclusao", "completed_at") as string | null) ?? null,
    statusNote:
      (valueOf(order, "observacao_status", "status_note") as string | null) ?? null,
    checklistItems: Array.isArray(checklist) ? checklist.map(normalizeChecklistItem) : [],
  };
}

export function login(payload: {
  email: string;
  password: string;
}): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", { body: payload });
}

export function requestPasswordReset(payload: {
  email: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/forgot-password", { body: payload });
}

export function resetPassword(payload: {
  token: string;
  newPassword: string;
}): Promise<MessageResponse> {
  return request<MessageResponse>("/auth/reset-password", {
    body: { token: payload.token, nova_senha: payload.newPassword },
  });
}

export function listUsers(params: {
  limit?: number;
  offset?: number;
  search?: string;
} = {}): Promise<User[]> {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  if (params.search) query.set("search", params.search);
  const suffix = query.size ? `?${query.toString()}` : "";
  return request<User[]>(`/users${suffix}`, {
    method: "GET",
    authenticated: true,
  });
}

export function getMyUser(): Promise<User> {
  return request<User>("/users/me", { method: "GET", authenticated: true });
}

export function listUserOptions(): Promise<UserOption[]> {
  return request<UserOption[]>("/users/options", {
    method: "GET",
    authenticated: true,
  });
}

export function createUser(payload: UserCreateInput): Promise<User> {
  return request<User>("/users", { body: payload, authenticated: true });
}

export function deleteUser(id: string): Promise<void> {
  return request<void>(`/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    authenticated: true,
  });
}

export function updateUser(
  id: string,
  changes: UserUpdateInput,
): Promise<User> {
  return request<User>(`/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: changes,
    authenticated: true,
  });
}

export async function getServiceOrderBoard(): Promise<
  Record<ServiceOrderStatus, ServiceOrder[]>
> {
  const result = (await request<unknown>("/ordens-servico/kanban", {
    method: "GET",
    authenticated: true,
  })) as Record<string, unknown>;
  const columns = (valueOf(result, "colunas", "columns") ?? {}) as Record<
    string,
    unknown
  >;
  const statuses: ServiceOrderStatus[] = [
    "BACKLOG",
    "EM_ANDAMENTO",
    "AGUARDANDO_PECA",
    "EM_REVISAO",
    "CONCLUIDO",
    "CANCELADO",
  ];
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      Array.isArray(columns[status]) ? columns[status].map(normalizeServiceOrder) : [],
    ]),
  ) as Record<ServiceOrderStatus, ServiceOrder[]>;
}

export async function createServiceOrder(
  input: ServiceOrderInput,
): Promise<ServiceOrder> {
  const payload = {
    titulo: input.title,
    descricao: input.description,
    prioridade: input.priority,
    cliente_id: input.clientId,
    equipamento_id: input.equipmentId ?? null,
    tecnico_id: input.technicianId || null,
    data_previsao: input.dueAt || null,
    checklist_itens: input.checklistItems.map((item) => ({
      descricao: item.description,
      obrigatorio: item.required,
      ordem: item.sortOrder,
    })),
  };
  const result = await request<unknown>("/ordens-servico/", {
    method: "POST",
    body: payload,
    authenticated: true,
  });
  return normalizeServiceOrder(result);
}

export async function updateServiceOrderStatus(
  id: number,
  status: ServiceOrderStatus,
): Promise<ServiceOrder> {
  const result = await request<unknown>(`/ordens-servico/${id}/status`, {
    method: "PATCH",
    body: { status },
    authenticated: true,
  });
  return normalizeServiceOrder(result);
}

export async function updateChecklistItem(
  orderId: number,
  itemId: number,
  changes: { completed?: boolean; technicianNote?: string },
): Promise<ChecklistItem> {
  const body: Record<string, unknown> = {};
  if (changes.completed !== undefined) body.concluido = changes.completed;
  if (changes.technicianNote !== undefined) {
    body.observacao_tecnico = changes.technicianNote;
  }
  const result = await request<unknown>(
    `/ordens-servico/${orderId}/checklist/${itemId}`,
    { method: "PATCH", body, authenticated: true },
  );
  return normalizeChecklistItem(result);
}

function normalizeEquipment(value: unknown): Equipment {
  const equipment = value as Record<string, unknown>;
  const specifications = valueOf(equipment, "especificacoes", "specifications");
  return {
    id: Number(equipment.id),
    code: String(valueOf(equipment, "codigo", "code") ?? ""),
    name: String(valueOf(equipment, "nome", "name") ?? ""),
    equipmentType: String(valueOf(equipment, "tipo", "equipment_type")) as EquipmentType,
    manufacturer: (valueOf(equipment, "fabricante", "manufacturer") as string | null) ?? null,
    model: (valueOf(equipment, "modelo", "model") as string | null) ?? null,
    serialNumber: (valueOf(equipment, "numero_serie", "serial_number") as string | null) ?? null,
    assetTag: (valueOf(equipment, "patrimonio", "asset_tag") as string | null) ?? null,
    location: (valueOf(equipment, "localizacao", "location") as string | null) ?? null,
    criticality: String(valueOf(equipment, "criticidade", "criticality")) as EquipmentCriticality,
    installationDate: (valueOf(equipment, "data_instalacao", "installation_date") as string | null) ?? null,
    notes: (valueOf(equipment, "observacoes", "notes") as string | null) ?? null,
    specifications: specifications && typeof specifications === "object"
      ? Object.fromEntries(Object.entries(specifications).map(([key, item]) => [key, Number(item)]))
      : {},
    createdAt: String(valueOf(equipment, "data_cadastro", "created_at") ?? ""),
    manualFileName: (valueOf(equipment, "manual_nome_arquivo", "manual_file_name") as string | null) ?? null,
  };
}

export async function getEquipmentTypes(): Promise<EquipmentTypeOption[]> {
  const result = await request<unknown[]>("/equipamentos/tipos", {
    method: "GET",
    authenticated: true,
  });
  return result.map((value) => {
    const option = value as Record<string, unknown>;
    const fields = valueOf(option, "campos", "fields");
    return {
      equipmentType: String(valueOf(option, "tipo", "equipment_type")) as EquipmentType,
      label: String(option.label ?? ""),
      fields: Array.isArray(fields)
        ? fields.map((field) => {
            const item = field as Record<string, unknown>;
            return {
              key: String(item.key ?? ""),
              label: String(item.label ?? ""),
              unit: String(item.unit ?? ""),
            };
          })
        : [],
    };
  });
}

export async function listEquipments(params: {
  equipmentType?: EquipmentType;
  limit?: number;
  offset?: number;
} = {}): Promise<Equipment[]> {
  const query = new URLSearchParams();
  if (params.equipmentType) query.set("tipo", params.equipmentType);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  const suffix = query.size ? `?${query.toString()}` : "";
  const result = await request<unknown[]>(`/equipamentos${suffix}`, {
    method: "GET",
    authenticated: true,
  });
  return result.map(normalizeEquipment);
}

export async function createEquipment(input: EquipmentInput, manual?: File): Promise<Equipment> {
  const formData = new FormData();
  formData.set("payload", JSON.stringify({
      nome: input.name,
      tipo: input.equipmentType,
      fabricante: input.manufacturer || null,
      modelo: input.model || null,
      numero_serie: input.serialNumber || null,
      patrimonio: input.assetTag || null,
      localizacao: input.location || null,
      criticidade: input.criticality,
      data_instalacao: input.installationDate || null,
      observacoes: input.notes || null,
      especificacoes: input.specifications,
  }));
  if (manual) formData.set("manual", manual);
  const result = await request<unknown>("/equipamentos", {
    body: formData,
    authenticated: true,
  });
  return normalizeEquipment(result);
}

export async function getEquipmentAdvice(equipmentId: number, problem: string): Promise<EquipmentAdvice> {
  const result = await request<unknown>(`/equipamentos/${equipmentId}/orientacao`, {
    body: { problema: problem },
    authenticated: true,
  });
  const advice = result as Record<string, unknown>;
  const checklist = valueOf(advice, "checklist_itens", "checklist");
  return {
    title: String(valueOf(advice, "titulo", "title") ?? ""),
    description: String(valueOf(advice, "descricao", "description") ?? ""),
    priority: String(valueOf(advice, "prioridade", "priority") ?? "MEDIA") as ServiceOrderPriority,
    checklistItems: Array.isArray(checklist)
      ? checklist.map((value, index) => {
          const item = value as Record<string, unknown>;
          return {
            description: String(valueOf(item, "descricao", "description") ?? ""),
            required: Boolean(valueOf(item, "obrigatorio", "required") ?? true),
            sortOrder: index,
          };
        })
      : [],
  };
}

export async function getEquipmentManual(equipmentId: number): Promise<Blob> {
  const path = `/equipamentos/${equipmentId}/manual`;
  let session = getAuthSession();
  if (!session?.access_token) {
    redirectToLogin();
    throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
  }

  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Não foi possível conectar à API para carregar o manual.", 0);
  }

  if (response.status === 401) {
    const refreshedSession = await refreshAuthSession();
    if (!refreshedSession) {
      redirectToLogin();
      throw new ApiError("Sua sessão expirou. Entre novamente.", 401);
    }
    session = refreshedSession;
    try {
      response = await fetch(API_BASE_URL + path, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
    } catch {
      throw new ApiError("Não foi possível conectar à API para carregar o manual.", 0);
    }
  }

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { detail?: unknown } | null;
    throw new ApiError(describeError(result?.detail), response.status);
  }
  return response.blob();
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const result = await request<unknown>("/dashboard/resumo", {
    method: "GET",
    authenticated: true,
  });
  const summary = result as Record<string, unknown>;
  const rawStatuses = valueOf(summary, "por_status", "by_status") as Record<string, unknown>;
  const rawPriorities = valueOf(summary, "por_prioridade", "by_priority") as Record<string, unknown>;
  const rawMonths = valueOf(summary, "atividade_mensal", "monthly_activity");
  const statuses: ServiceOrderStatus[] = [
    "BACKLOG", "EM_ANDAMENTO", "AGUARDANDO_PECA", "EM_REVISAO", "CONCLUIDO", "CANCELADO",
  ];
  const priorities: ServiceOrderPriority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
  return {
    openOrders: Number(valueOf(summary, "os_abertas", "open_orders") ?? 0),
    closedOrders: Number(valueOf(summary, "os_fechadas", "closed_orders") ?? 0),
    completedOrders: Number(valueOf(summary, "os_concluidas", "completed_orders") ?? 0),
    cancelledOrders: Number(valueOf(summary, "os_canceladas", "cancelled_orders") ?? 0),
    overdueOrders: Number(valueOf(summary, "os_atrasadas", "overdue_orders") ?? 0),
    byStatus: Object.fromEntries(statuses.map((status) => [status, Number(rawStatuses?.[status] ?? 0)])) as Record<ServiceOrderStatus, number>,
    byPriority: Object.fromEntries(priorities.map((priority) => [priority, Number(rawPriorities?.[priority] ?? 0)])) as Record<ServiceOrderPriority, number>,
    monthlyActivity: Array.isArray(rawMonths)
      ? rawMonths.map((month) => {
          const item = month as Record<string, unknown>;
          return {
            month: String(valueOf(item, "mes", "month") ?? ""),
            opened: Number(valueOf(item, "abertas", "opened") ?? 0),
            completed: Number(valueOf(item, "concluidas", "completed") ?? 0),
          };
        })
      : [],
  };
}
