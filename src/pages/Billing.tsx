import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAppState } from "@/hooks/use-app-state";
import { formatINR } from "@/lib/currency";
import { sendNotificationEmail } from "@/lib/notification-email";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, IndianRupee, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";

type Invoice = {
  id: string;
  dbId?: string;
  guest: string;
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  amount: number; // total
  date: string; // YYYY-MM-DD
  status: InvoiceStatus;
};

const initialInvoices: Invoice[] = [
  { id: "INV-001", guest: "Sarah Johnson", taxableAmount: 1750, gstRate: 0, gstAmount: 0, amount: 1750, date: "2024-07-25", status: "Paid" },
  { id: "INV-002", guest: "Mike Chen", taxableAmount: 360, gstRate: 0, gstAmount: 0, amount: 360, date: "2024-07-23", status: "Paid" },
  { id: "INV-003", guest: "Emily Davis", taxableAmount: 2100, gstRate: 0, gstAmount: 0, amount: 2100, date: "2024-07-28", status: "Pending" },
  { id: "INV-004", guest: "James Wilson", taxableAmount: 240, gstRate: 0, gstAmount: 0, amount: 240, date: "2024-07-22", status: "Paid" },
  { id: "INV-005", guest: "Anna Martinez", taxableAmount: 540, gstRate: 0, gstAmount: 0, amount: 540, date: "2024-07-26", status: "Overdue" },
  { id: "INV-006", guest: "Robert Brown", taxableAmount: 720, gstRate: 0, gstAmount: 0, amount: 720, date: "2024-07-27", status: "Pending" },
];

const statusColors: Record<InvoiceStatus, string> = {
  Paid: "bg-success/10 text-success border-success/20",
  Pending: "bg-warning/10 text-warning border-warning/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

function formatInvoiceId(numberValue: number) {
  return `INV-${String(numberValue).padStart(3, "0")}`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function mapSupabaseStatus(value: string | null): InvoiceStatus {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "paid") return "Paid";
  if (normalized === "overdue") return "Overdue";
  return "Pending";
}

type PaymentSettings = {
  property?: {
    name?: string;
    email?: string;
  };
  notifications?: {
    paymentAlerts?: boolean;
  };
  payments?: {
    merchantName?: string;
    upiVpa?: string;
  };
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayConstructorOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayConstructor = new (options: RazorpayConstructorOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

function buildUpiPaymentLink(params: { vpa: string; name: string; amount: number; note: string }) {
  const am = params.amount.toFixed(2);
  return (
    "upi://pay" +
    `?pa=${encodeURIComponent(params.vpa)}` +
    `&pn=${encodeURIComponent(params.name)}` +
    `&am=${encodeURIComponent(am)}` +
    "&cu=INR" +
    `&tn=${encodeURIComponent(params.note)}`
  );
}

const Billing = () => {
  const [invoices, setInvoices] = useAppState<Invoice[]>("rm_invoices", initialInvoices);
  const [settings] = useAppState<PaymentSettings>("rm_settings", {});
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [newInvoice, setNewInvoice] = useState<{
    guest: string;
    taxableAmount: string;
    gstRate: string;
    date: string;
    status: InvoiceStatus;
  }>({
    guest: "",
    taxableAmount: "",
    gstRate: "0",
    date: "",
    status: "Pending",
  });

  const canSubmitNewInvoice =
    newInvoice.guest.trim().length > 0 &&
    Number.isFinite(Number(newInvoice.taxableAmount)) &&
    Number(newInvoice.taxableAmount) >= 0 &&
    Number.isFinite(Number(newInvoice.gstRate)) &&
    Number(newInvoice.gstRate) >= 0 &&
    newInvoice.date.length > 0;

  const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;
  const configuredFunctionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined;
  const proxiedFunctionsUrl =
    import.meta.env.DEV && typeof window !== "undefined" ? `${window.location.origin}/supabase/functions/v1` : undefined;
  const inferredFunctionsUrl =
    import.meta.env.VITE_SUPABASE_URL && typeof import.meta.env.VITE_SUPABASE_URL === "string"
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
      : undefined;
  const functionsBaseUrl = configuredFunctionsUrl || proxiedFunctionsUrl || inferredFunctionsUrl;
  const isGatewayConfigured = Boolean(razorpayKeyId && functionsBaseUrl);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("invoices")
        .select("id,invoice_number,guest_name,taxable_amount,gst_rate,gst_amount,amount,due_date,paid_date,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled || error || !data) return;

      setInvoices((prev) => {
        const previousByDbId = new Map(prev.filter((invoice) => invoice.dbId).map((invoice) => [invoice.dbId as string, invoice]));

        return data.map((row, index) => {
          const existing = previousByDbId.get(row.id);
          const amount = Number(row.amount ?? existing?.amount ?? 0);
          const taxableAmount = Number(row.taxable_amount ?? existing?.taxableAmount ?? amount);
          const gstRate = Number(row.gst_rate ?? existing?.gstRate ?? 0);
          const gstAmount = Number(row.gst_amount ?? existing?.gstAmount ?? amount - taxableAmount);

          return {
            id: row.invoice_number || existing?.id || formatInvoiceId(data.length - index),
            dbId: row.id,
            guest: row.guest_name || existing?.guest || "Guest",
            taxableAmount,
            gstRate,
            gstAmount,
            amount,
            date: row.paid_date || row.due_date || existing?.date || new Date().toISOString().slice(0, 10),
            status: mapSupabaseStatus(row.status),
          } satisfies Invoice;
        });
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [setInvoices]);

  const ensureRazorpayScript = async () => {
    if (window.Razorpay) return;

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout.")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
      document.body.appendChild(script);
    });
  };

  const getAuthHeaders = async () => {
    if (!supabase) {
      return { "Content-Type": "application/json" };
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    };
  };

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    let targetDbId: string | undefined;

    setInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        targetDbId = inv.dbId;
        return {
          ...inv,
          status,
          date: status === "Paid" ? new Date().toISOString().slice(0, 10) : inv.date,
        };
      });
      return updated;
    });

    if (!supabase || !targetDbId) return;

    await supabase
      .from("invoices")
      .update({
        status,
        paid_date: status === "Paid" ? new Date().toISOString().slice(0, 10) : null,
      })
      .eq("id", targetDbId);
  };

  const handleGatewayPayment = async (invoice: Invoice) => {
    if (!razorpayKeyId || !functionsBaseUrl) {
      toast({ title: "Gateway not configured", description: "Razorpay key or function URL is missing.", variant: "destructive" });
      return;
    }

    setPayingInvoiceId(invoice.id);

    try {
      await ensureRazorpayScript();
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is unavailable.");
      }

      const orderRes = await fetch(`${functionsBaseUrl}/create-razorpay-order`, {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          amount: invoice.amount,
          currency: "INR",
          receipt: invoice.id,
          notes: {
            invoiceId: invoice.id,
            guest: invoice.guest,
          },
        }),
      });

      if (!orderRes.ok) {
        const message = await orderRes.text();
        throw new Error(message || "Unable to create payment order.");
      }

      const orderData = (await orderRes.json()) as {
        orderId: string;
        amountPaise: number;
        currency: string;
      };

      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: razorpayKeyId,
          amount: orderData.amountPaise,
          currency: orderData.currency,
          name: settings.payments?.merchantName?.trim() || "Hotel",
          description: `Invoice ${invoice.id}`,
          order_id: orderData.orderId,
          notes: {
            invoiceId: invoice.id,
          },
          prefill: {
            name: invoice.guest,
            email: user?.email,
          },
          handler: async (paymentResponse) => {
            try {
              const verifyRes = await fetch(`${functionsBaseUrl}/verify-razorpay-payment`, {
                method: "POST",
                headers: await getAuthHeaders(),
                body: JSON.stringify({
                  invoiceId: invoice.id,
                  amount: invoice.amount,
                  ...paymentResponse,
                }),
              });

              if (!verifyRes.ok) {
                const message = await verifyRes.text();
                throw new Error(message || "Payment verification failed.");
              }

              await updateInvoiceStatus(invoice.id, "Paid");
              toast({
                title: "Payment successful",
                description: `Invoice ${invoice.id} has been marked as paid.`,
              });

              if (settings.notifications?.paymentAlerts && settings.property?.email) {
                void sendNotificationEmail({
                  to: settings.property.email,
                  subject: `Payment received: ${invoice.id}`,
                  text:
                    `Payment received successfully.\n\n` +
                    `Invoice: ${invoice.id}\nGuest: ${invoice.guest}\nAmount: ${formatINR(invoice.amount)}\nStatus: Paid`,
                });
              }

              resolve();
            } catch (error) {
              reject(error instanceof Error ? error : new Error("Payment verification failed."));
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled.")),
          },
        });

        checkout.open();
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed. Please try again.";
      toast({ title: "Payment failed", description: message, variant: "destructive" });
    } finally {
      setPayingInvoiceId(null);
    }
  };

  const handleUpiDeepLink = (invoice: Invoice) => {
    const vpa = settings.payments?.upiVpa?.trim();
    if (!vpa) {
      toast({
        title: "UPI VPA missing",
        description: "Add UPI VPA in Settings to use direct UPI payment link.",
        variant: "destructive",
      });
      return;
    }
    const link = buildUpiPaymentLink({
      vpa,
      name: settings.payments?.merchantName?.trim() || "Hotel",
      amount: invoice.amount,
      note: `${invoice.id} - ${invoice.guest}`,
    });
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const summary = useMemo(() => {
    let paidTotal = 0;
    let pendingTotal = 0;
    let overdueTotal = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const inv of invoices) {
      if (inv.status === "Paid") {
        paidTotal += inv.amount;
      } else if (inv.status === "Pending") {
        pendingTotal += inv.amount;
        pendingCount += 1;
      } else if (inv.status === "Overdue") {
        overdueTotal += inv.amount;
        overdueCount += 1;
      }
    }

    return {
      paidTotal,
      pendingTotal,
      overdueTotal,
      pendingCount,
      overdueCount,
    };
  }, [invoices]);

  const handleCreateInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewInvoice) return;

    const maxExisting = invoices
      .map((inv) => Number(inv.id.replace(/^INV-?/i, "")))
      .filter((n) => Number.isFinite(n))
      .reduce((max, n) => Math.max(max, n), 0);

    const taxableAmount = Number(newInvoice.taxableAmount);
    const gstRate = Number(newInvoice.gstRate);
    const gstAmount = Math.round((taxableAmount * gstRate) / 100);
    const totalAmount = taxableAmount + gstAmount;

    const next: Invoice = {
      id: formatInvoiceId(maxExisting + 1),
      guest: newInvoice.guest.trim(),
      taxableAmount,
      gstRate,
      gstAmount,
      amount: totalAmount,
      date: newInvoice.date,
      status: newInvoice.status,
    };

    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Session required",
          description: "Please login again before creating invoices.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          invoice_number: next.id,
          guest_name: next.guest,
          booking_id: null,
          taxable_amount: taxableAmount,
          gst_rate: gstRate,
          gst_amount: gstAmount,
          amount: totalAmount,
          due_date: newInvoice.date,
          paid_date: newInvoice.status === "Paid" ? newInvoice.date : null,
          status: newInvoice.status,
        })
        .select("id")
        .single();

      if (error || !data) {
        toast({
          title: "Invoice save failed",
          description: "Unable to save invoice in backend. Please try again.",
          variant: "destructive",
        });
        return;
      }

      next.dbId = data.id;
    }

    setInvoices((prev) => [next, ...prev]);

    toast({
      title: "Invoice created",
      description: `Invoice ${next.id} for ${next.guest} has been created successfully.`,
    });

    if (settings.notifications?.paymentAlerts && settings.property?.email) {
      void sendNotificationEmail({
        to: settings.property.email,
        subject: `Invoice created: ${next.id}`,
        text:
          `A new invoice was created.\n\n` +
          `Invoice: ${next.id}\nGuest: ${next.guest}\nAmount: ${formatINR(next.amount)}\nStatus: ${next.status}`,
      });
    }

    setAddOpen(false);
    setNewInvoice({ guest: "", taxableAmount: "", gstRate: "0", date: "", status: "Pending" });
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const doc = new jsPDF();
    const merchantName = settings.payments?.merchantName?.trim() || "Hotel";

    doc.setFontSize(16);
    doc.text("Invoice", 14, 18);
    doc.setFontSize(10);
    doc.text(`Merchant: ${merchantName}`, 14, 26);
    doc.text(`Invoice ID: ${invoice.id}`, 14, 32);
    doc.text(`Guest: ${invoice.guest}`, 14, 38);
    doc.text(`Date: ${formatDate(invoice.date)}`, 14, 44);
    doc.text(`Status: ${invoice.status}`, 14, 50);

    autoTable(doc, {
      startY: 58,
      head: [["Item", "Amount"]],
      body: [
        ["Taxable Amount", formatINR(invoice.taxableAmount)],
        [`GST (${invoice.gstRate}%)`, formatINR(invoice.gstAmount)],
        ["Total", formatINR(invoice.amount)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`${invoice.id}.pdf`);
  };

  const handleExportAllInvoices = () => {
    const doc = new jsPDF();
    const merchantName = settings.payments?.merchantName?.trim() || "Hotel";

    doc.setFontSize(16);
    doc.text("Invoices Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Merchant: ${merchantName}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [["Invoice", "Guest", "Taxable", "GST %", "GST", "Total", "Date", "Status"]],
      body: invoices.map((inv) => [
        inv.id,
        inv.guest,
        formatINR(inv.taxableAmount),
        String(inv.gstRate),
        formatINR(inv.gstAmount),
        formatINR(inv.amount),
        formatDate(inv.date),
        inv.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save("invoices.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted-foreground">Invoices and payment tracking</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportAllInvoices}>
            <Download className="h-4 w-4" /> Export PDF
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-guest">Guest</Label>
                <Input
                  id="invoice-guest"
                  placeholder="Guest name"
                  value={newInvoice.guest}
                  onChange={(e) => setNewInvoice((prev) => ({ ...prev, guest: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-taxable">Taxable Amount</Label>
                  <Input
                    id="invoice-taxable"
                    inputMode="decimal"
                    placeholder="e.g. 540"
                    value={newInvoice.taxableAmount}
                    onChange={(e) => setNewInvoice((prev) => ({ ...prev, taxableAmount: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-date">Date</Label>
                  <Input
                    id="invoice-date"
                    type="date"
                    value={newInvoice.date}
                    onChange={(e) => setNewInvoice((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoice-gst">GST %</Label>
                  <Input
                    id="invoice-gst"
                    inputMode="decimal"
                    placeholder="e.g. 12"
                    value={newInvoice.gstRate}
                    onChange={(e) => setNewInvoice((prev) => ({ ...prev, gstRate: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-total">Total (auto)</Label>
                  <Input
                    id="invoice-total"
                    readOnly
                    value={(() => {
                      const taxable = Number(newInvoice.taxableAmount);
                      const gstRate = Number(newInvoice.gstRate);
                      if (!Number.isFinite(taxable) || !Number.isFinite(gstRate)) return "";
                      const gst = Math.round((taxable * gstRate) / 100);
                      return formatINR(taxable + gst);
                    })()}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newInvoice.status}
                  onValueChange={(value) => setNewInvoice((prev) => ({ ...prev, status: value as InvoiceStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewInvoice}>
                  Create Invoice
                </Button>
              </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          { label: "Total Revenue", value: formatINR(summary.paidTotal), sub: "Paid" },
          {
            label: "Pending",
            value: formatINR(summary.pendingTotal),
            sub: `${summary.pendingCount} invoice${summary.pendingCount === 1 ? "" : "s"}`,
          },
          {
            label: "Overdue",
            value: formatINR(summary.overdueTotal),
            sub: `${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"}`,
          },
        ].map((s) => (
          <Card key={s.label} className="border-none shadow-sm">
            <CardContent className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <IndianRupee className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground">
                {s.label} · {s.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Guest</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-primary">{inv.id}</td>
                  <td className="px-5 py-3 text-foreground">{inv.guest}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{formatINR(inv.amount)}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3">
                    <Badge variant="outline" className={statusColors[inv.status]}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={inv.status === "Paid" || payingInvoiceId === inv.id}
                        onClick={() => {
                          if (isGatewayConfigured) {
                            void handleGatewayPayment(inv);
                            return;
                          }
                          handleUpiDeepLink(inv);
                        }}
                      >
                        {payingInvoiceId === inv.id ? "Processing..." : isGatewayConfigured ? "Pay Online" : "Pay UPI"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Download ${inv.id}`}
                        onClick={() => handleDownloadInvoice(inv)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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

export default Billing;
