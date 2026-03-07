import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const admins = [
  { name: "Ravi Sharma", email: "ravi@hotelcentral.com", property: "Delhi Central", status: "Active" },
  { name: "Meera Kapoor", email: "meera@jaipurpalace.com", property: "Jaipur Palace", status: "Active" },
  { name: "Arjun Nair", email: "arjun@goabay.com", property: "Goa Bay", status: "Pending" },
  { name: "Pooja Singh", email: "pooja@bluestar.com", property: "Blue Star", status: "Suspended" },
];

const toneMap: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Suspended: "bg-red-100 text-red-700",
};

const SuperAdminUsers = () => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Admin User Directory</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Property</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, idx) => (
                <tr key={idx} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 font-medium text-slate-900">{admin.name}</td>
                  <td className="py-3 text-slate-600">{admin.email}</td>
                  <td className="py-3 text-slate-600">{admin.property}</td>
                  <td className="py-3">
                    <Badge variant="secondary" className={toneMap[admin.status]}>
                      {admin.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SuperAdminUsers;
