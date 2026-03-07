import {
  BedDouble,
  CalendarCheck,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { formatINR } from "@/lib/currency";
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

const stats = [
  { label: "Total Rooms", value: "120", icon: BedDouble, change: "+2", trend: "up" },
  { label: "Active Bookings", value: "87", icon: CalendarCheck, change: "+12%", trend: "up" },
  { label: "Guests Today", value: "156", icon: Users, change: "+8", trend: "up" },
  { label: "Revenue (MTD)", value: formatINR(48290), icon: DollarSign, change: "+18%", trend: "up" },
];

const revenueData = [
  { month: "Jan", revenue: 32000 },
  { month: "Feb", revenue: 28000 },
  { month: "Mar", revenue: 35000 },
  { month: "Apr", revenue: 40000 },
  { month: "May", revenue: 38000 },
  { month: "Jun", revenue: 45000 },
  { month: "Jul", revenue: 48290 },
];

const roomStatusData = [
  { name: "Occupied", value: 72, color: "hsl(var(--primary))" },
  { name: "Available", value: 35, color: "hsl(var(--success))" },
  { name: "Maintenance", value: 8, color: "hsl(var(--warning))" },
  { name: "Cleaning", value: 5, color: "hsl(var(--info))" },
];

const recentBookings = [
  { guest: "Sarah Johnson", room: "Suite 401", checkIn: "Jul 20", checkOut: "Jul 25", status: "Checked In" },
  { guest: "Mike Chen", room: "Room 215", checkIn: "Jul 21", checkOut: "Jul 23", status: "Confirmed" },
  { guest: "Emily Davis", room: "Suite 502", checkIn: "Jul 22", checkOut: "Jul 28", status: "Pending" },
  { guest: "James Wilson", room: "Room 108", checkIn: "Jul 20", checkOut: "Jul 22", status: "Checked In" },
  { guest: "Anna Martinez", room: "Room 312", checkIn: "Jul 23", checkOut: "Jul 26", status: "Confirmed" },
];

const statusColors: Record<string, string> = {
  "Checked In": "bg-success/10 text-success",
  Confirmed: "bg-primary/10 text-primary",
  Pending: "bg-warning/10 text-warning",
};

const Dashboard = () => {
  const { user } = useAuth();

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
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  {stat.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.change}
                </span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
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
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[booking.status]}`}>
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
