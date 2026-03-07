import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/hooks/use-app-state";
import { formatINR } from "@/lib/currency";
import { toast } from "@/components/ui/use-toast";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useAuditLog } from "@/hooks/use-audit-log";
import { sendNotificationEmail } from "@/lib/notification-email";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";

type BookingStatus = "Checked In" | "Checked Out" | "Confirmed" | "Pending" | "Cancelled";

type RoomRecord = {
  id: string;
  number: string;
  status: "available" | "occupied" | "maintenance" | "cleaning";
  guest?: string;
};

type HousekeepingTask = {
  id: string;
  room: string;
  task: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
};

type Booking = {
  id: string;
  dbId?: string;
  guest: string;
  room: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  total: number; // USD
  status: BookingStatus;
};

type BookingRow = {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: BookingStatus;
  total_cost: number | null;
  notes: string | null;
  created_at: string;
};

type NotificationSettings = {
  property?: {
    name?: string;
    email?: string;
  };
  notifications?: {
    newBookings?: boolean;
    checkInReminders?: boolean;
    housekeepingUpdates?: boolean;
  };
};

const initialBookings: Booking[] = [
  { id: "BK001", guest: "Sarah Johnson", room: "Suite 401", checkIn: "2024-07-20", checkOut: "2024-07-25", total: 1750, status: "Checked In" },
  { id: "BK002", guest: "Mike Chen", room: "Room 215", checkIn: "2024-07-21", checkOut: "2024-07-23", total: 360, status: "Confirmed" },
  { id: "BK003", guest: "Emily Davis", room: "Suite 502", checkIn: "2024-07-22", checkOut: "2024-07-28", total: 2100, status: "Pending" },
  { id: "BK004", guest: "James Wilson", room: "Room 108", checkIn: "2024-07-20", checkOut: "2024-07-22", total: 240, status: "Checked In" },
  { id: "BK005", guest: "Anna Martinez", room: "Room 312", checkIn: "2024-07-23", checkOut: "2024-07-26", total: 540, status: "Confirmed" },
  { id: "BK006", guest: "Robert Brown", room: "Deluxe 210", checkIn: "2024-07-24", checkOut: "2024-07-27", total: 720, status: "Pending" },
  { id: "BK007", guest: "Lisa Wang", room: "Suite 601", checkIn: "2024-07-25", checkOut: "2024-07-30", total: 2500, status: "Confirmed" },
];

const statusColors: Record<BookingStatus, string> = {
  "Checked In": "bg-success/10 text-success border-success/20",
  "Checked Out": "bg-muted text-muted-foreground border-border",
  Confirmed: "bg-primary/10 text-primary border-primary/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

function getRoomNumberFromLabel(roomLabel: string) {
  const matches = roomLabel.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  return matches[matches.length - 1];
}

function formatBookingId(numberValue: number) {
  return `BK${String(numberValue).padStart(3, "0")}`;
}

function parseBookingRef(notes: string | null, dbId: string): string {
  if (notes) {
    const refMatch = notes.match(/booking_ref\s*:\s*([^;]+)/i);
    if (refMatch?.[1]) return refMatch[1].trim();
  }
  return `BK-${dbId.slice(0, 8).toUpperCase()}`;
}

function parseRoom(notes: string | null): string {
  if (!notes) return "-";
  const roomMatch = notes.match(/room\s*:\s*([^;]+)/i);
  return roomMatch?.[1]?.trim() || "-";
}

// Check if two date ranges overlap
function datesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  return s1 < e2 && s2 < e1;
}

// Check if a booking conflicts with existing bookings for the same room
function hasBookingConflict(
  bookings: Booking[],
  room: string,
  checkIn: string,
  checkOut: string,
  excludeId?: string
): boolean {
  return bookings.some((booking) => {
    if (booking.id === excludeId) return false;
    if (booking.room !== room) return false;
    // Only check against active bookings (not cancelled or checked out)
    if (booking.status === "Cancelled" || booking.status === "Checked Out") return false;
    return datesOverlap(checkIn, checkOut, booking.checkIn, booking.checkOut);
  });
}

const Bookings = () => {
  const [bookings, setBookings] = useAppState<Booking[]>("rm_bookings", initialBookings);
  const [rooms, setRooms] = useAppState<RoomRecord[]>("rm_rooms", []);
  const [housekeepingTasks, setHousekeepingTasks] = useAppState<HousekeepingTask[]>("rm_housekeeping_tasks", []);
  const [settings] = useAppState<NotificationSettings>("rm_settings", {});
  const { logAction } = useAuditLog();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [newBooking, setNewBooking] = useState<{
    guest: string;
    room: string;
    total: string;
    status: BookingStatus;
  }>({
    guest: "",
    room: "",
    total: "",
    status: "Confirmed",
  });

  const canSubmitNewBooking =
    newBooking.guest.trim().length > 0 &&
    newBooking.room.trim().length > 0 &&
    dateRange?.from &&
    dateRange?.to &&
    Number.isFinite(Number(newBooking.total)) &&
    Number(newBooking.total) >= 0;

  const filteredBookings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch.length === 0) return bookings;
    return bookings.filter((b) => {
      return (
        b.id.toLowerCase().includes(normalizedSearch) ||
        b.guest.toLowerCase().includes(normalizedSearch) ||
        b.room.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [bookings, search]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("bookings")
        .select("id,guest_name,check_in,check_out,status,total_cost,notes,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load bookings from Supabase:", error);
        return;
      }

      if (cancelled) return;

      const mapped = ((data as BookingRow[] | null) || []).map((row) => ({
        id: parseBookingRef(row.notes, row.id),
        dbId: row.id,
        guest: row.guest_name,
        room: parseRoom(row.notes),
        checkIn: row.check_in,
        checkOut: row.check_out,
        total: row.total_cost ?? 0,
        status: row.status,
      }));

      setBookings(mapped);
    })();

    return () => {
      cancelled = true;
    };
  }, [setBookings]);

  const handleCreateBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewBooking || !dateRange?.from || !dateRange?.to) return;

    const checkInDate = format(dateRange.from, "yyyy-MM-dd");
    const checkOutDate = format(dateRange.to, "yyyy-MM-dd");

    // Check for booking conflicts
    if (hasBookingConflict(bookings, newBooking.room, checkInDate, checkOutDate)) {
      toast({
        title: "Booking conflict detected",
        description: `Room ${newBooking.room} is already booked for the selected dates. Please choose different dates or another room.`,
        variant: "destructive",
      });
      return;
    }

    const maxExisting = bookings
      .map((b) => Number(b.id.replace(/^BK/i, "")))
      .filter((n) => Number.isFinite(n))
      .reduce((max, n) => Math.max(max, n), 0);

    const bookingRef = formatBookingId(maxExisting + 1);

    if (!isSupabaseConfigured || !supabase) {
      toast({
        title: "Supabase not configured",
        description: "Database connection is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        variant: "destructive",
      });
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast({
        title: "Session required",
        description: "Please log in again before creating bookings.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        guest_name: newBooking.guest.trim(),
        room_id: null,
        check_in: checkInDate,
        check_out: checkOutDate,
        status: newBooking.status,
        total_cost: Number(newBooking.total),
        notes: `booking_ref:${bookingRef}; room:${newBooking.room.trim()}`,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving booking to Supabase:", error);
      toast({
        title: "Booking save failed",
        description: error.message || "Could not save booking to database.",
        variant: "destructive",
      });
      return;
    }

    const next: Booking = {
      id: bookingRef,
      dbId: data.id,
      guest: newBooking.guest.trim(),
      room: newBooking.room.trim(),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      total: Number(newBooking.total),
      status: newBooking.status,
    };

    setBookings((prev) => [next, ...prev]);

    logAction({
      module: "bookings",
      action: "booking_created",
      details: `${next.id} for ${next.guest} in ${next.room} from ${next.checkIn} to ${next.checkOut}.`,
    });
    toast({
      title: "Booking created",
      description: `Booking ${next.id} for ${next.guest} has been created successfully.`,
    });

    if (settings.notifications?.newBookings && settings.property?.email) {
      void sendNotificationEmail({
        to: settings.property.email,
        subject: `New booking created: ${next.id}`,
        text:
          `A new booking was created.\n\n` +
          `Booking: ${next.id}\nGuest: ${next.guest}\nRoom: ${next.room}\n` +
          `Check-in: ${next.checkIn}\nCheck-out: ${next.checkOut}\nAmount: ${formatINR(next.total)}`,
      });
    }

    setAddOpen(false);
    setDateRange(undefined);
    setNewBooking({
      guest: "",
      room: "",
      total: "",
      status: "Confirmed",
    });
  };

  const updateRoomOccupancy = (params: { roomLabel: string; guest: string; occupied: boolean }) => {
    const roomNumber = getRoomNumberFromLabel(params.roomLabel);
    if (!roomNumber) return;
    if (rooms.length === 0) return;

    setRooms((prev) =>
      prev.map((room) => {
        if (room.number !== roomNumber) return room;
        if (params.occupied) {
          return { ...room, status: "occupied", guest: params.guest };
        }
        return { ...room, status: "available", guest: undefined };
      }),
    );
  };

  const handleCheckIn = async (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) return;
    if (
      targetBooking.status === "Checked In" ||
      targetBooking.status === "Checked Out" ||
      targetBooking.status === "Cancelled"
    ) {
      return;
    }

    updateRoomOccupancy({ roomLabel: targetBooking.room, guest: targetBooking.guest, occupied: true });
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "Checked In" } : b)));

    // Update in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let query = supabase
        .from('bookings')
        .update({ status: 'Checked In' })
        .eq('user_id', user.id);

      if (targetBooking.dbId) {
        query = query.eq('id', targetBooking.dbId);
      } else {
        query = query
          .eq('guest_name', targetBooking.guest)
          .eq('check_in', targetBooking.checkIn)
          .eq('check_out', targetBooking.checkOut);
      }

      await query;
    }

    logAction({
      module: "bookings",
      action: "booking_checked_in",
      details: `${targetBooking.id} checked in for room ${targetBooking.room}.`,
    });

    if (settings.notifications?.checkInReminders && settings.property?.email) {
      void sendNotificationEmail({
        to: settings.property.email,
        subject: `Guest checked in: ${targetBooking.id}`,
        text:
          `Check-in update\n\n` +
          `Booking: ${targetBooking.id}\nGuest: ${targetBooking.guest}\nRoom: ${targetBooking.room}\nStatus: Checked In`,
      });
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking || targetBooking.status !== "Checked In") return;

    updateRoomOccupancy({ roomLabel: targetBooking.room, guest: targetBooking.guest, occupied: false });
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "Checked Out" } : b)));

    // Update in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let query = supabase
        .from('bookings')
        .update({ status: 'Checked Out' })
        .eq('user_id', user.id);

      if (targetBooking.dbId) {
        query = query.eq('id', targetBooking.dbId);
      } else {
        query = query
          .eq('guest_name', targetBooking.guest)
          .eq('check_in', targetBooking.checkIn)
          .eq('check_out', targetBooking.checkOut);
      }

      await query;
    }

    const roomNumber = getRoomNumberFromLabel(targetBooking.room);
    if (roomNumber) {
      const hasOpenTask = housekeepingTasks.some(
        (task) => task.room === roomNumber && task.status !== "Completed" && /turnover clean/i.test(task.task),
      );

      if (!hasOpenTask) {
        const taskId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (crypto as any).randomUUID()
            : String(Date.now());

        setHousekeepingTasks((prevTasks) => [
          {
            id: taskId,
            room: roomNumber,
            task: "Turnover Clean",
            assignee: "Unassigned",
            priority: "High",
            status: "Pending",
          },
          ...prevTasks,
        ]);

        // Save housekeeping task to Supabase
        if (user) {
          await supabase
            .from('housekeeping')
            .insert({
              user_id: user.id,
              room_id: null,
              type: 'Turnover Clean',
              status: 'Pending',
              task_date: new Date().toISOString().split('T')[0],
              notes: `Room: ${roomNumber} | From booking ${targetBooking.id}`,
            });
        }

        logAction({
          module: "housekeeping",
          action: "task_auto_created",
          details: `Turnover clean task auto-created for Room ${roomNumber} from booking ${targetBooking.id}.`,
        });

        toast({
          title: "Housekeeping task created",
          description: `Turnover clean task added for Room ${roomNumber}.`,
        });

        if (settings.notifications?.housekeepingUpdates && settings.property?.email) {
          void sendNotificationEmail({
            to: settings.property.email,
            subject: `Housekeeping task created for Room ${roomNumber}`,
            text:
              `A turnover clean task was auto-created.\n\n` +
              `Room: ${roomNumber}\nSource booking: ${targetBooking.id}\nTask: Turnover Clean\nPriority: High`,
          });
        }
      }
    }

    logAction({
      module: "bookings",
      action: "booking_checked_out",
      details: `${targetBooking.id} checked out from room ${targetBooking.room}.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage reservations and check-ins</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New Booking</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="booking-guest">Guest</Label>
                  <Input
                    id="booking-guest"
                    placeholder="Guest name"
                    value={newBooking.guest}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, guest: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-room">Room</Label>
                  <Input
                    id="booking-room"
                    placeholder="e.g. Room 215"
                    value={newBooking.room}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, room: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Check In - Check Out</Label>
                <DateRangePicker
                  date={dateRange}
                  onDateChange={setDateRange}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="booking-total">Total</Label>
                  <Input
                    id="booking-total"
                    inputMode="decimal"
                    placeholder="e.g. 540"
                    value={newBooking.total}
                    onChange={(e) => setNewBooking((prev) => ({ ...prev, total: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newBooking.status}
                    onValueChange={(value) => setNewBooking((prev) => ({ ...prev, status: value as BookingStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checked In">Checked In</SelectItem>
                      <SelectItem value="Checked Out">Checked Out</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewBooking}>
                  Create Booking
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search bookings..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Booking ID</th>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Room</th>
                  <th className="px-5 py-3 font-medium">Check In</th>
                  <th className="px-5 py-3 font-medium">Check Out</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3 font-medium text-primary">{b.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{b.guest}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.room}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.checkIn}</td>
                    <td className="px-5 py-3 text-muted-foreground">{b.checkOut}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{formatINR(b.total)}</td>
                    <td className="px-5 py-3">
                      <Badge variant="outline" className={statusColors[b.status]}>{b.status}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        {(b.status === "Confirmed" || b.status === "Pending") && (
                          <Button size="sm" variant="outline" onClick={() => handleCheckIn(b.id)}>
                            Check in
                          </Button>
                        )}
                        {b.status === "Checked In" && (
                          <Button size="sm" variant="outline" onClick={() => handleCheckOut(b.id)}>
                            Check out
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bookings;
