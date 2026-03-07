import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { useAppState } from "@/hooks/use-app-state";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { formatINR } from "@/lib/currency";
import { Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Booking = {
  id: string;
  guest: string;
  room: string;
  checkIn: string;
  checkOut: string;
  total: number;
  status: "Checked In" | "Checked Out" | "Confirmed" | "Pending" | "Cancelled";
};

type Invoice = {
  id: string;
  guest: string;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  amount: number;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
};

const monthSortValue = (month: string) => {
  const date = new Date(`${month} 01, 2026`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatDateLabel = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
};

const Reports = () => {
  const [bookings] = useAppState<Booking[]>("rm_bookings", []);
  const [invoices] = useAppState<Invoice[]>("rm_invoices", []);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const filteredBookings = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return bookings;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);

    return bookings.filter((booking) => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return false;
      return checkIn <= to && checkOut >= from;
    });
  }, [bookings, dateRange]);

  const filteredInvoices = useMemo(() => {
    if (!dateRange?.from || !dateRange.to) return invoices;
    const from = new Date(dateRange.from);
    const to = new Date(dateRange.to);

    return invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.date);
      if (Number.isNaN(invoiceDate.getTime())) return false;
      return invoiceDate >= from && invoiceDate <= to;
    });
  }, [invoices, dateRange]);

  const summary = useMemo(() => {
    const totalRevenue = filteredInvoices.reduce((sum, item) => sum + item.amount, 0);
    const paidRevenue = filteredInvoices.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);
    const pendingRevenue = filteredInvoices
      .filter((item) => item.status === "Pending" || item.status === "Overdue")
      .reduce((sum, item) => sum + item.amount, 0);

    const roomCounts = filteredBookings.reduce<Record<string, number>>((acc, booking) => {
      const roomKey = booking.room || "Unknown";
      acc[roomKey] = (acc[roomKey] || 0) + 1;
      return acc;
    }, {});

    const topRoom = Object.entries(roomCounts).reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      ["N/A", 0] as [string, number],
    );

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      totalBookings: filteredBookings.length,
      topRoom: topRoom[0],
    };
  }, [filteredBookings, filteredInvoices]);

  const bookingTrendData = useMemo(() => {
    const monthly = filteredBookings.reduce<Record<string, number>>((acc, booking) => {
      const date = new Date(booking.checkIn);
      if (Number.isNaN(date.getTime())) return acc;
      const month = date.toLocaleString(undefined, { month: "short" });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(monthly)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => monthSortValue(a.month) - monthSortValue(b.month));
  }, [filteredBookings]);

  const revenueByStatus = useMemo(() => {
    const totals: Record<Invoice["status"], number> = { Paid: 0, Pending: 0, Overdue: 0 };
    for (const invoice of filteredInvoices) {
      totals[invoice.status] += invoice.amount;
    }
    return [
      { status: "Paid", revenue: totals.Paid },
      { status: "Pending", revenue: totals.Pending },
      { status: "Overdue", revenue: totals.Overdue },
    ];
  }, [filteredInvoices]);

  const handleExportReport = () => {
    const doc = new jsPDF();
    const getFinalY = () => {
      const maybeDoc = doc as jsPDF & { lastAutoTable?: { finalY?: number } };
      return maybeDoc.lastAutoTable?.finalY ?? 40;
    };
    const rangeLabel =
      dateRange?.from && dateRange?.to
        ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
        : "All dates";

    doc.setFontSize(16);
    doc.text("Reports Summary", 14, 18);
    doc.setFontSize(10);
    doc.text(`Range: ${rangeLabel}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Metric", "Value"]],
      body: [
        ["Total Revenue", formatINR(summary.totalRevenue)],
        ["Paid Revenue", formatINR(summary.paidRevenue)],
        ["Pending/Overdue Revenue", formatINR(summary.pendingRevenue)],
        ["Bookings", String(summary.totalBookings)],
        ["Top Room", summary.topRoom],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    autoTable(doc, {
      startY: getFinalY() + 8,
      head: [["Booking", "Guest", "Room", "Check In", "Check Out", "Status"]],
      body: filteredBookings.map((item) => [
        item.id,
        item.guest,
        item.room,
        formatDateLabel(item.checkIn),
        formatDateLabel(item.checkOut),
        item.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    autoTable(doc, {
      startY: getFinalY() + 8,
      head: [["Invoice", "Guest", "Date", "Status", "Amount"]],
      body: filteredInvoices.map((item) => [
        item.id,
        item.guest,
        formatDateLabel(item.date),
        item.status,
        formatINR(item.amount),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save("reports.pdf");
  };

  const tooltipStyle = {
    borderRadius: "12px",
    backgroundColor: "hsl(var(--popover))",
    color: "hsl(var(--popover-foreground))",
    border: "1px solid hsl(var(--border))",
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Analytics and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" className="gap-2" onClick={handleExportReport}>
            <Download className="h-4 w-4" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatINR(summary.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Paid Revenue</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatINR(summary.paidRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Pending Revenue</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{formatINR(summary.pendingRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Bookings</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Top Room</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{summary.topRoom}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Bookings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={bookingTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [String(value), "Bookings"]} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => {
                    const numericValue = typeof v === "number" ? v : Number(v);
                    if (Number.isFinite(numericValue)) return [formatINR(numericValue), "Revenue"];
                    return [String(v), "Revenue"];
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
