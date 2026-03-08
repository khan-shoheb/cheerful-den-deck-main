import {
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR } from "@/lib/currency";
import { useAppState } from "@/hooks/use-app-state";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";
type BookingStatus = "Checked In" | "Checked Out" | "Confirmed" | "Pending" | "Cancelled";
type InvoiceStatus = "Paid" | "Pending" | "Overdue";

type Room = {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: RoomStatus;
};

type Booking = {
  id: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: BookingStatus;
};

type Guest = {
  id: string;
  name: string;
};

type Invoice = {
  id: string;
  amount: number;
  date: string;
  status: InvoiceStatus;
};

type TrendDirection = "up" | "down" | "neutral";

const statusColors: Record<string, string> = {
  "Checked In": "bg-success/10 text-success",
  Confirmed: "bg-primary/10 text-primary",
  Pending: "bg-warning/10 text-warning",
  "Checked Out": "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

function parseDateInput(value: string): Date | null {
  if (!value) return null;

  const onlyDate = /^\d{4}-\d{2}-\d{2}$/;
  if (onlyDate.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateOnly(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1).replace(/\.0$/, "")}%`;
}

function calculatePercentChange(current: number, previous: number): { change: string; trend: TrendDirection } {
  if (previous === 0 && current === 0) return { change: "0%", trend: "neutral" };
  if (previous === 0) return { change: "+100%", trend: "up" };

  const raw = ((current - previous) / previous) * 100;
  const trend: TrendDirection = raw > 0 ? "up" : raw < 0 ? "down" : "neutral";
  return { change: formatPercent(raw), trend };
}

function calculatePointChange(current: number, previous: number): { change: string; trend: TrendDirection } {
  const diff = Math.round((current - previous) * 10) / 10;
  const sign = diff > 0 ? "+" : "";
  const trend: TrendDirection = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  const display = `${sign}${diff.toFixed(1).replace(/\.0$/, "")}pp`;
  return { change: display, trend };
}

function isBookingActiveOn(booking: Booking, day: Date): boolean {
  if (booking.status === "Cancelled" || booking.status === "Checked Out") return false;

  const checkIn = parseDateInput(booking.checkIn);
  const checkOut = parseDateInput(booking.checkOut);
  if (!checkIn || !checkOut) return false;

  const start = toDateOnly(checkIn);
  const end = toDateOnly(checkOut);
  const target = toDateOnly(day);
  return start <= target && target < end;
}

function isDateInRangeInclusive(dateValue: string, start: Date, end: Date): boolean {
  const date = parseDateInput(dateValue);
  if (!date) return false;
  const target = toDateOnly(date);
  return target >= toDateOnly(start) && target <= toDateOnly(end);
}

const Dashboard = () => {
  const { user } = useAuth();
  const [rooms] = useAppState<Room[]>("rm_rooms", []);
  const [bookings] = useAppState<Booking[]>("rm_bookings", []);
  const [guests] = useAppState<Guest[]>("rm_guests", []);
  const [invoices] = useAppState<Invoice[]>("rm_invoices", []);

  const now = useMemo(() => toDateOnly(new Date()), []);
  const currentMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);
  const previousMonthStart = useMemo(() => new Date(now.getFullYear(), now.getMonth() - 1, 1), [now]);
  const previousMonthEnd = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 0), [now]);
  const currentDayOfMonth = now.getDate();
  const previousComparableEnd = useMemo(
    () => new Date(previousMonthStart.getFullYear(), previousMonthStart.getMonth(), Math.min(currentDayOfMonth, previousMonthEnd.getDate())),
    [currentDayOfMonth, previousMonthEnd, previousMonthStart],
  );
  const yesterday = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), [now]);
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const activeBookingsCount = useMemo(() => {
    return bookings.filter((booking) => isBookingActiveOn(booking, now)).length;
  }, [bookings, now]);

  const activeBookingsYesterday = useMemo(() => {
    return bookings.filter((booking) => isBookingActiveOn(booking, yesterday)).length;
  }, [bookings, yesterday]);

  const guestsTodayCount = useMemo(() => {
    const fromCheckIns = bookings.filter((booking) => booking.checkIn === todayIso && booking.status !== "Cancelled").length;
    if (fromCheckIns > 0) return fromCheckIns;
    return guests.length;
  }, [bookings, guests.length, todayIso]);

  const yesterdayGuests = useMemo(() => {
    return bookings.filter((booking) => booking.checkIn === yesterdayIso && booking.status !== "Cancelled").length;
  }, [bookings, yesterdayIso]);

  const occupiedRoomsToday = useMemo(() => {
    return new Set(bookings.filter((booking) => isBookingActiveOn(booking, now)).map((booking) => booking.room)).size;
  }, [bookings, now]);

  const occupiedRoomsYesterday = useMemo(() => {
    return new Set(bookings.filter((booking) => isBookingActiveOn(booking, yesterday)).map((booking) => booking.room)).size;
  }, [bookings, yesterday]);

  const currentOccupancyRate = rooms.length > 0 ? (occupiedRoomsToday / rooms.length) * 100 : 0;
  const previousOccupancyRate = rooms.length > 0 ? (occupiedRoomsYesterday / rooms.length) * 100 : 0;

  const revenueMtd = useMemo(() => {
    const paidThisMonth = invoices
      .filter((invoice) => {
        return invoice.status === "Paid" && isDateInRangeInclusive(invoice.date, currentMonthStart, now);
      })
      .reduce((sum, invoice) => sum + (Number.isFinite(invoice.amount) ? invoice.amount : 0), 0);

    if (paidThisMonth > 0) return paidThisMonth;

    return bookings
      .filter((booking) => {
        return booking.status !== "Cancelled" && isDateInRangeInclusive(booking.checkIn, currentMonthStart, now);
      })
      .reduce((sum, booking) => sum + (Number.isFinite(booking.total) ? booking.total : 0), 0);
  }, [bookings, currentMonthStart, invoices, now]);

  const previousMonthRevenue = useMemo(() => {
    const paidPrevious = invoices
      .filter((invoice) => invoice.status === "Paid" && isDateInRangeInclusive(invoice.date, previousMonthStart, previousComparableEnd))
      .reduce((sum, invoice) => sum + (Number.isFinite(invoice.amount) ? invoice.amount : 0), 0);

    if (paidPrevious > 0) return paidPrevious;

    return bookings
      .filter((booking) => booking.status !== "Cancelled" && isDateInRangeInclusive(booking.checkIn, previousMonthStart, previousComparableEnd))
      .reduce((sum, booking) => sum + (Number.isFinite(booking.total) ? booking.total : 0), 0);
  }, [bookings, invoices, previousComparableEnd, previousMonthStart]);

  const roomsChange = calculatePointChange(currentOccupancyRate, previousOccupancyRate);

  const bookingsChange = calculatePercentChange(activeBookingsCount, activeBookingsYesterday);
  const guestsTodayChange = calculatePercentChange(guestsTodayCount, yesterdayGuests);
  const revenueChange = calculatePercentChange(revenueMtd, previousMonthRevenue);

  const stats = [
    {
      label: "Total Rooms",
      value: String(rooms.length),
      icon: BedDouble,
      change: roomsChange.change,
      trend: roomsChange.trend,
      compareLabel: "vs yesterday occupancy",
    },
    {
      label: "Active Bookings",
      value: String(activeBookingsCount),
      icon: CalendarCheck,
      change: bookingsChange.change,
      trend: bookingsChange.trend,
      compareLabel: "vs yesterday",
    },
    {
      label: "Guests Today",
      value: String(guestsTodayCount),
      icon: Users,
      change: guestsTodayChange.change,
      trend: guestsTodayChange.trend,
      compareLabel: "vs yesterday",
    },
    {
      label: "Revenue (MTD)",
      value: formatINR(revenueMtd),
      icon: DollarSign,
      change: revenueChange.change,
      trend: revenueChange.trend,
      compareLabel: "vs same period last month",
    },
  ];

  const revenueData = useMemo(() => {
    const rows: Array<{ month: string; revenue: number }> = [];

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1);
      const month = date.toLocaleString(undefined, { month: "short" });

      const monthRevenue = invoices
        .filter((invoice) => {
          const invoiceDate = new Date(invoice.date);
          return (
            invoice.status === "Paid" &&
            !Number.isNaN(invoiceDate.getTime()) &&
            invoiceDate.getMonth() === date.getMonth() &&
            invoiceDate.getFullYear() === date.getFullYear()
          );
        })
        .reduce((sum, invoice) => sum + (Number.isFinite(invoice.amount) ? invoice.amount : 0), 0);

      rows.push({ month, revenue: monthRevenue });
    }

    return rows;
  }, [currentMonthStart, invoices]);

  const roomStatusData = useMemo(
    () => [
      { name: "Occupied", value: rooms.filter((room) => room.status === "occupied").length, color: "hsl(var(--primary))" },
      { name: "Available", value: rooms.filter((room) => room.status === "available").length, color: "hsl(var(--success))" },
      {
        name: "Maintenance",
        value: rooms.filter((room) => room.status === "maintenance").length,
        color: "hsl(var(--warning))",
      },
      { name: "Cleaning", value: rooms.filter((room) => room.status === "cleaning").length, color: "hsl(var(--info))" },
    ],
    [rooms],
  );

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())
      .slice(0, 5)
      .map((booking) => ({
        guest: booking.guest,
        room: booking.room,
        checkIn: new Date(booking.checkIn).toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
        checkOut: new Date(booking.checkOut).toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
        status: booking.status,
      }));
  }, [bookings]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name || "Guest"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stat.trend === "up" ? "text-success" : stat.trend === "down" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : stat.trend === "down" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-muted-foreground/80">{stat.compareLabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="border-none shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(value) => {
                    const numericValue = typeof value === "number" ? value : Number(value);
                    if (Number.isFinite(numericValue)) {
                      return [formatINR(numericValue), "Revenue"];
                    }
                    return [String(value), "Revenue"];
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Room Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={roomStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  dataKey="value"
                  stroke="none"
                >
                  {roomStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {roomStatusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
            <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs">
              <Link to="/bookings" className="flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Guest</th>
                  <th className="pb-3 font-medium">Room</th>
                  <th className="pb-3 font-medium">Check In</th>
                  <th className="pb-3 font-medium">Check Out</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((booking, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 font-medium text-foreground">{booking.guest}</td>
                    <td className="py-3 text-muted-foreground">{booking.room}</td>
                    <td className="py-3 text-muted-foreground">{booking.checkIn}</td>
                    <td className="py-3 text-muted-foreground">{booking.checkOut}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[booking.status] || "bg-muted text-muted-foreground"}`}
                      >
                        {booking.status}
                      </span>
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

export default Dashboard;
