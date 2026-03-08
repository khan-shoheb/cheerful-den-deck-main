import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";
export type GuestStatus = "Checked In" | "Upcoming" | "Checked Out" | "VIP";
export type StaffStatus = "On Duty" | "Off Duty";
export type StaffShift = "Morning" | "Evening" | "Night";
export type HousekeepingPriority = "High" | "Medium" | "Low";
export type HousekeepingStatus = "Pending" | "In Progress" | "Completed";

export type RoomRecord = {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: RoomStatus;
  price: number;
  guest?: string;
  imageUrl?: string;
};

export type GuestRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  status: GuestStatus;
  lastVisit: string;
};

export type StaffRecord = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: StaffStatus;
  shift: StaffShift;
};

export type HousekeepingTaskRecord = {
  id: string;
  room: string;
  task: string;
  assignee: string;
  priority: HousekeepingPriority;
  status: HousekeepingStatus;
};

export type SettingsRecord = {
  property: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  notifications: {
    newBookings: boolean;
    checkInReminders: boolean;
    paymentAlerts: boolean;
    housekeepingUpdates: boolean;
  };
  payments: {
    merchantName: string;
    upiVpa: string;
  };
};

export const canUseBackend = (): boolean => {
  if (!isSupabaseConfigured || !supabase) return false;
  if (typeof window === "undefined") return true;

  // Local mock auth mode is used only as a dev fallback when Supabase auth user is unavailable.
  const authSource = window.localStorage.getItem("rm_auth_source");
  return authSource !== "local-mock";
};

const getCurrentUserId = async (): Promise<string | null> => {
  if (!canUseBackend()) return null;

  const {
    data: { user },
    error,
  } = await supabase!.auth.getUser();

  if (error || !user) return null;
  return user.id;
};

export const fetchRooms = async (): Promise<RoomRecord[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase!
    .from("rooms")
    .select("id,name,type,floor,guest_name,price_per_night,status,image_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const rawNumber = String(row.name ?? "").trim();
    const floorFromNumber = Number(rawNumber.charAt(0));
    const floorFromDb = Number(row.floor ?? NaN);

    return {
      id: row.id,
      number: rawNumber,
      type: row.type ?? "Standard",
      floor:
        Number.isFinite(floorFromDb) && floorFromDb > 0
          ? floorFromDb
          : Number.isFinite(floorFromNumber) && floorFromNumber > 0
            ? floorFromNumber
            : 1,
      status: (row.status as RoomStatus) ?? "available",
      price: Number(row.price_per_night ?? 0),
      guest: typeof row.guest_name === "string" && row.guest_name.length > 0 ? row.guest_name : undefined,
      imageUrl: row.image_url ?? undefined,
    };
  });
};

export const createRoom = async (room: RoomRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("rooms").insert({
    user_id: userId,
    name: room.number,
    type: room.type,
    floor: room.floor,
    guest_name: room.guest ?? null,
    price_per_night: room.price,
    status: room.status,
    image_url: room.imageUrl ?? null,
  });

  return !error;
};

export const updateRoom = async (room: RoomRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!
    .from("rooms")
    .update({
      name: room.number,
      type: room.type,
      floor: room.floor,
      guest_name: room.guest ?? null,
      price_per_night: room.price,
      status: room.status,
      image_url: room.imageUrl ?? null,
    })
    .eq("user_id", userId)
    .eq("id", room.id);

  return !error;
};

export const deleteRoom = async (roomId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("rooms").delete().eq("user_id", userId).eq("id", roomId);
  return !error;
};

export const fetchGuests = async (): Promise<GuestRecord[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase!
    .from("guests")
    .select("id,name,email,phone,visits,status,last_visit")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    visits: Number(row.visits ?? 0),
    status: (row.status as GuestStatus) ?? "Upcoming",
    lastVisit: typeof row.last_visit === "string" && row.last_visit.length > 0 ? row.last_visit : new Date().toISOString().slice(0, 10),
  }));
};

export const createGuest = async (guest: GuestRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("guests").insert({
    user_id: userId,
    name: guest.name,
    email: guest.email,
    phone: guest.phone,
    visits: guest.visits,
    status: guest.status,
    last_visit: guest.lastVisit,
  });

  return !error;
};

export const updateGuest = async (guest: GuestRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!
    .from("guests")
    .update({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      visits: guest.visits,
      status: guest.status,
      last_visit: guest.lastVisit,
    })
    .eq("user_id", userId)
    .eq("id", guest.id);

  return !error;
};

export const deleteGuest = async (guestId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("guests").delete().eq("user_id", userId).eq("id", guestId);
  return !error;
};

export const fetchStaffMembers = async (): Promise<StaffRecord[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase!
    .from("staff_members")
    .select("id,name,role,email,phone,status,shift")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    status: (row.status as StaffStatus) ?? "On Duty",
    shift: (row.shift as StaffShift) ?? "Morning",
  }));
};

export const createStaffMember = async (staff: StaffRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("staff_members").insert({
    user_id: userId,
    name: staff.name,
    role: staff.role,
    email: staff.email,
    phone: staff.phone,
    status: staff.status,
    shift: staff.shift,
  });

  return !error;
};

export const updateStaffMember = async (staff: StaffRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!
    .from("staff_members")
    .update({
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone,
      status: staff.status,
      shift: staff.shift,
    })
    .eq("user_id", userId)
    .eq("id", staff.id);

  return !error;
};

export const deleteStaffMember = async (staffId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("staff_members").delete().eq("user_id", userId).eq("id", staffId);
  return !error;
};

function parseHousekeepingNotes(notes: string | null): { room?: string; assignee?: string; priority?: HousekeepingPriority } {
  if (!notes) return {};

  try {
    const parsed = JSON.parse(notes) as { room?: unknown; assignee?: unknown; priority?: unknown };
    const priority = String(parsed.priority ?? "") as HousekeepingPriority;
    return {
      room: typeof parsed.room === "string" ? parsed.room : undefined,
      assignee: typeof parsed.assignee === "string" ? parsed.assignee : undefined,
      priority: priority === "High" || priority === "Medium" || priority === "Low" ? priority : undefined,
    };
  } catch {
    const roomMatch = notes.match(/room\s*:\s*([^|;]+)/i);
    const assigneeMatch = notes.match(/assignee\s*:\s*([^|;]+)/i);
    const priorityMatch = notes.match(/priority\s*:\s*(High|Medium|Low)/i);
    return {
      room: roomMatch?.[1]?.trim(),
      assignee: assigneeMatch?.[1]?.trim(),
      priority: (priorityMatch?.[1] as HousekeepingPriority | undefined) ?? undefined,
    };
  }
}

export const fetchHousekeepingTasks = async (): Promise<HousekeepingTaskRecord[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase!
    .from("housekeeping")
    .select("id,type,status,notes,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const parsed = parseHousekeepingNotes(row.notes ?? null);
    const status = (row.status as HousekeepingStatus) ?? "Pending";

    return {
      id: row.id,
      room: parsed.room || "-",
      task: row.type || "General Task",
      assignee: parsed.assignee || "Unassigned",
      priority: parsed.priority || "Medium",
      status,
    };
  });
};

export const createHousekeepingTask = async (task: HousekeepingTaskRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const notesPayload = JSON.stringify({
    room: task.room,
    assignee: task.assignee,
    priority: task.priority,
  });

  const { error } = await supabase!.from("housekeeping").insert({
    user_id: userId,
    room_id: null,
    type: task.task,
    status: task.status,
    task_date: new Date().toISOString().slice(0, 10),
    notes: notesPayload,
  });

  return !error;
};

export const updateHousekeepingTask = async (task: HousekeepingTaskRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const notesPayload = JSON.stringify({
    room: task.room,
    assignee: task.assignee,
    priority: task.priority,
  });

  const { error } = await supabase!
    .from("housekeeping")
    .update({
      type: task.task,
      status: task.status,
      notes: notesPayload,
    })
    .eq("user_id", userId)
    .eq("id", task.id);

  return !error;
};

export const deleteHousekeepingTask = async (taskId: string): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("housekeeping").delete().eq("user_id", userId).eq("id", taskId);
  return !error;
};

export const fetchSettings = async (): Promise<SettingsRecord | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data, error } = await supabase!
    .from("property_settings")
    .select("property,notifications,payments")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    property: (data.property ?? {}) as SettingsRecord["property"],
    notifications: (data.notifications ?? {}) as SettingsRecord["notifications"],
    payments: (data.payments ?? {}) as SettingsRecord["payments"],
  };
};

export const upsertSettings = async (settings: SettingsRecord): Promise<boolean> => {
  const userId = await getCurrentUserId();
  if (!userId) return false;

  const { error } = await supabase!.from("property_settings").upsert(
    {
      user_id: userId,
      property: settings.property,
      notifications: settings.notifications,
      payments: settings.payments,
    },
    { onConflict: "user_id" },
  );

  return !error;
};
