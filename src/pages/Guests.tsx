import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/hooks/use-app-state";
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
import { Search, Plus, Mail, Phone } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { canUseBackend, createGuest, deleteGuest, fetchGuests, updateGuest, type GuestRecord } from "@/lib/hotel-api";

type GuestStatus = "Checked In" | "Upcoming" | "Checked Out" | "VIP";

const initialGuests: GuestRecord[] = [
  { id: "1", name: "Sarah Johnson", email: "sarah@email.com", phone: "+1 555-0101", visits: 5, status: "Checked In", lastVisit: "2024-07-20" },
  { id: "2", name: "Mike Chen", email: "mike@email.com", phone: "+1 555-0102", visits: 2, status: "Upcoming", lastVisit: "2024-07-21" },
  { id: "3", name: "Emily Davis", email: "emily@email.com", phone: "+1 555-0103", visits: 8, status: "Checked In", lastVisit: "2024-07-22" },
  { id: "4", name: "James Wilson", email: "james@email.com", phone: "+1 555-0104", visits: 1, status: "Checked Out", lastVisit: "2024-07-18" },
  { id: "5", name: "Anna Martinez", email: "anna@email.com", phone: "+1 555-0105", visits: 12, status: "VIP", lastVisit: "2024-07-23" },
  { id: "6", name: "Robert Brown", email: "robert@email.com", phone: "+1 555-0106", visits: 3, status: "Upcoming", lastVisit: "2024-07-24" },
];

const statusColors: Record<GuestStatus, string> = {
  "Checked In": "bg-success/10 text-success border-success/20",
  Upcoming: "bg-primary/10 text-primary border-primary/20",
  "Checked Out": "bg-muted text-muted-foreground border-border",
  VIP: "bg-warning/10 text-warning border-warning/20",
};

const Guests = () => {
  const [guests, setGuests] = useAppState<GuestRecord[]>("rm_guests", initialGuests);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [isSavingGuest, setIsSavingGuest] = useState(false);
  const [busyGuestId, setBusyGuestId] = useState<string | null>(null);
  const [editGuest, setEditGuest] = useState<GuestRecord | null>(null);
  const [newGuest, setNewGuest] = useState<{
    name: string;
    email: string;
    phone: string;
    visits: string;
    status: GuestStatus;
    lastVisit: string;
  }>({
    name: "",
    email: "",
    phone: "",
    visits: "0",
    status: "Upcoming",
    lastVisit: "",
  });

  const canSubmitNewGuest =
    newGuest.name.trim().length > 0 &&
    newGuest.email.trim().length > 0 &&
    newGuest.phone.trim().length > 0 &&
    Number.isFinite(Number(newGuest.visits)) &&
    Number(newGuest.visits) >= 0;

  useEffect(() => {
    if (!canUseBackend()) return;

    let cancelled = false;

    (async () => {
      const remoteGuests = await fetchGuests();
      if (cancelled) return;
      setGuests(remoteGuests);
    })();

    return () => {
      cancelled = true;
    };
  }, [setGuests]);

  const filteredGuests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch.length === 0) return guests;
    return guests.filter((g) => {
      return (
        g.name.toLowerCase().includes(normalizedSearch) ||
        g.email.toLowerCase().includes(normalizedSearch) ||
        g.phone.toLowerCase().includes(normalizedSearch) ||
        g.status.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [guests, search]);

  const handleCreateGuest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewGuest || isCreatingGuest) return;

    setIsCreatingGuest(true);

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now());

    const nextGuest: GuestRecord = {
      id,
      name: newGuest.name.trim(),
      email: newGuest.email.trim(),
      phone: newGuest.phone.trim(),
      visits: Number(newGuest.visits),
      status: newGuest.status,
      lastVisit: newGuest.lastVisit || new Date().toISOString().slice(0, 10),
    };

    if (canUseBackend()) {
      const isCreated = await createGuest(nextGuest);
      if (!isCreated) {
        setIsCreatingGuest(false);
        toast({
          title: "Guest save failed",
          description: "Unable to save guest in backend. Please re-login and try again.",
          variant: "destructive",
        });
        return;
      }
    }

    setGuests((prev) => [nextGuest, ...prev]);

    setAddOpen(false);
    setNewGuest({
      name: "",
      email: "",
      phone: "",
      visits: "0",
      status: "Upcoming",
      lastVisit: "",
    });

    toast({
      title: "Guest created",
      description: `${nextGuest.name} has been created successfully.`,
    });

    setIsCreatingGuest(false);
  };

  const handleSaveGuest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editGuest || isSavingGuest) return;

    setIsSavingGuest(true);
    const previousGuests = guests;
    setGuests((prev) => prev.map((g) => (g.id === editGuest.id ? editGuest : g)));

    if (canUseBackend()) {
      const ok = await updateGuest(editGuest);
      if (!ok) {
        setGuests(previousGuests);
        setIsSavingGuest(false);
        toast({ title: "Update failed", description: "Unable to update guest in backend.", variant: "destructive" });
        return;
      }
    }

    setEditOpen(false);
    setEditGuest(null);
    toast({ title: "Guest updated", description: `${editGuest.name} updated successfully.` });
    setIsSavingGuest(false);
  };

  const handleDeleteGuest = async (guest: GuestRecord) => {
    if (busyGuestId) return;
    if (!window.confirm(`Delete guest ${guest.name}?`)) return;

    const previousGuests = guests;
    setBusyGuestId(guest.id);
    setGuests((prev) => prev.filter((g) => g.id !== guest.id));

    if (canUseBackend()) {
      const ok = await deleteGuest(guest.id);
      if (!ok) {
        setGuests(previousGuests);
        setBusyGuestId(null);
        toast({ title: "Delete failed", description: "Unable to delete guest from backend.", variant: "destructive" });
        return;
      }
    }

    toast({ title: "Guest deleted", description: `${guest.name} deleted successfully.` });
    setBusyGuestId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guests</h1>
          <p className="text-sm text-muted-foreground">Manage guest profiles and history</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Guest
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Guest</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateGuest} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-name">Name</Label>
                  <Input
                    id="guest-name"
                    placeholder="Full name"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newGuest.status}
                    onValueChange={(value) => setNewGuest((prev) => ({ ...prev, status: value as GuestStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Checked In">Checked In</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                      <SelectItem value="Checked Out">Checked Out</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-email">Email</Label>
                  <Input
                    id="guest-email"
                    type="email"
                    placeholder="name@email.com"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-phone">Phone</Label>
                  <Input
                    id="guest-phone"
                    placeholder="+1 555-0101"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guest-visits">Visits</Label>
                  <Input
                    id="guest-visits"
                    inputMode="numeric"
                    value={newGuest.visits}
                    onChange={(e) => setNewGuest((prev) => ({ ...prev, visits: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guest-lastvisit">Last Visit</Label>
                  <Input
                    id="guest-lastvisit"
                    type="date"
                    value={newGuest.lastVisit}
                    onChange={(e) => setNewGuest((prev) => ({ ...prev, lastVisit: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewGuest || isCreatingGuest}>
                  {isCreatingGuest ? "Adding..." : "Add Guest"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditGuest(null);
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Guest</DialogTitle>
            </DialogHeader>
            {editGuest && (
              <form onSubmit={handleSaveGuest} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-guest-name">Name</Label>
                    <Input
                      id="edit-guest-name"
                      value={editGuest.name}
                      onChange={(e) => setEditGuest((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-guest-status">Status</Label>
                    <Input
                      id="edit-guest-status"
                      value={editGuest.status}
                      onChange={(e) =>
                        setEditGuest((prev) =>
                          prev ? { ...prev, status: e.target.value as GuestStatus } : prev,
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-guest-email">Email</Label>
                    <Input
                      id="edit-guest-email"
                      value={editGuest.email}
                      onChange={(e) => setEditGuest((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-guest-phone">Phone</Label>
                    <Input
                      id="edit-guest-phone"
                      value={editGuest.phone}
                      onChange={(e) => setEditGuest((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingGuest}>{isSavingGuest ? "Saving..." : "Save"}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map((g) => (
          <Card key={g.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {g.name
                      .split(" ")
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.visits} visits</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusColors[g.status]}>{g.status}</Badge>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{g.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{g.phone}</div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => { setEditGuest(g); setEditOpen(true); }}>
                  Edit
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={busyGuestId === g.id} onClick={() => void handleDeleteGuest(g)}>
                  {busyGuestId === g.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Guests;
