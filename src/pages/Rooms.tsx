import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { BedDouble, Search, Plus } from "lucide-react";
import { useAppState } from "@/hooks/use-app-state";
import { formatINR } from "@/lib/currency";
import { toast } from "@/components/ui/use-toast";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuditLog } from "@/hooks/use-audit-log";

type RoomStatus = "available" | "occupied" | "maintenance" | "cleaning";

interface Room {
  id: string;
  number: string;
  type: string;
  floor: number;
  status: RoomStatus;
  price: number;
  guest?: string;
  imageUrl?: string;
}

const initialRooms: Room[] = [
  { id: "1", number: "101", type: "Standard", floor: 1, status: "occupied", price: 120, guest: "Sarah Johnson" },
  { id: "2", number: "102", type: "Standard", floor: 1, status: "available", price: 120 },
  { id: "3", number: "103", type: "Deluxe", floor: 1, status: "cleaning", price: 180 },
  { id: "4", number: "104", type: "Standard", floor: 1, status: "available", price: 120 },
  { id: "5", number: "201", type: "Deluxe", floor: 2, status: "occupied", price: 180, guest: "Mike Chen" },
  { id: "6", number: "202", type: "Suite", floor: 2, status: "occupied", price: 350, guest: "Emily Davis" },
  { id: "7", number: "203", type: "Standard", floor: 2, status: "maintenance", price: 120 },
  { id: "8", number: "204", type: "Deluxe", floor: 2, status: "available", price: 180 },
  { id: "9", number: "301", type: "Suite", floor: 3, status: "occupied", price: 350, guest: "James Wilson" },
  { id: "10", number: "302", type: "Deluxe", floor: 3, status: "available", price: 180 },
  { id: "11", number: "303", type: "Standard", floor: 3, status: "occupied", price: 120, guest: "Anna Martinez" },
  { id: "12", number: "304", type: "Suite", floor: 3, status: "available", price: 350 },
];

const statusConfig: Record<RoomStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-success/10 text-success border-success/20" },
  occupied: { label: "Occupied", className: "bg-primary/10 text-primary border-primary/20" },
  maintenance: { label: "Maintenance", className: "bg-warning/10 text-warning border-warning/20" },
  cleaning: { label: "Cleaning", className: "bg-info/10 text-info border-info/20" },
};

const Rooms = () => {
  const [rooms, setRooms] = useAppState<Room[]>("rm_rooms", initialRooms);
  const { logAction } = useAuditLog();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RoomStatus | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [newRoomImageFile, setNewRoomImageFile] = useState<File | null>(null);
  const [newRoomImagePreview, setNewRoomImagePreview] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState<{
    number: string;
    type: string;
    floor: string;
    status: RoomStatus;
    price: string;
    guest: string;
  }>({
    number: "",
    type: "Standard",
    floor: "1",
    status: "available",
    price: "120",
    guest: "",
  });

  const canSubmitNewRoom =
    newRoom.number.trim().length > 0 &&
    newRoom.type.trim().length > 0 &&
    Number.isFinite(Number(newRoom.floor)) &&
    Number(newRoom.floor) > 0 &&
    Number.isFinite(Number(newRoom.price)) &&
    Number(newRoom.price) >= 0;

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = reader.result;
        if (typeof value === "string") {
          resolve(value);
          return;
        }
        reject(new Error("Unable to read selected image."));
      };
      reader.onerror = () => reject(new Error("Unable to read selected image."));
      reader.readAsDataURL(file);
    });

  const uploadRoomImage = async (params: { roomId: string; imageFile: File }): Promise<string> => {
    if (!isSupabaseConfigured || !supabase) {
      return readFileAsDataUrl(params.imageFile);
    }

    const safeName = params.imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${params.roomId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from("room-images").upload(filePath, params.imageFile, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    const { data } = supabase.storage.from("room-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSelectRoomImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setNewRoomImageFile(null);
      setNewRoomImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
      event.currentTarget.value = "";
      return;
    }

    setNewRoomImageFile(file);

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setNewRoomImagePreview(previewUrl);
    } catch {
      setNewRoomImagePreview(null);
      toast({
        title: "Preview unavailable",
        description: "Image selected, but preview could not be generated.",
      });
    }
  };

  const handleCreateRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitNewRoom) return;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (crypto as any).randomUUID()
        : String(Date.now());

    let imageUrl: string | undefined;
    if (newRoomImageFile) {
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadRoomImage({ roomId: id, imageFile: newRoomImageFile });
      } catch {
        toast({
          title: "Image upload failed",
          description: "Please verify your storage bucket setup and try again.",
          variant: "destructive",
        });
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const nextRoom: Room = {
      id,
      number: newRoom.number.trim(),
      type: newRoom.type.trim(),
      floor: Number(newRoom.floor),
      status: newRoom.status,
      price: Number(newRoom.price),
      guest: newRoom.status === "occupied" ? newRoom.guest.trim() || undefined : undefined,
      imageUrl,
    };

    setRooms((prev) => [nextRoom, ...prev]);
    logAction({
      module: "rooms",
      action: "room_created",
      details: `Room ${nextRoom.number} (${nextRoom.type}) created on floor ${nextRoom.floor}.`,
    });
    setAddOpen(false);
    setIsUploadingImage(false);
    setNewRoomImageFile(null);
    setNewRoomImagePreview(null);
    setNewRoom({
      number: "",
      type: "Standard",
      floor: "1",
      status: "available",
      price: "120",
      guest: "",
    });
  };

  const counts = rooms.reduce(
    (acc, room) => {
      acc.total += 1;
      acc[room.status] += 1;
      return acc;
    },
    { total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0 } as Record<"total" | RoomStatus, number>,
  );

  const filtered = rooms.filter((r) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchSearch =
      normalizedSearch.length === 0 ||
      r.number.includes(normalizedSearch) ||
      r.type.toLowerCase().includes(normalizedSearch) ||
      (r.guest?.toLowerCase().includes(normalizedSearch) ?? false);
    const matchFilter = filter === "all" || r.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
          <p className="text-sm text-muted-foreground">Manage all rooms and their status</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Room</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="room-number">Room Number</Label>
                  <Input
                    id="room-number"
                    placeholder="e.g. 405"
                    value={newRoom.number}
                    onChange={(e) => setNewRoom((prev) => ({ ...prev, number: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newRoom.type} onValueChange={(value) => setNewRoom((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="room-floor">Floor</Label>
                  <Input
                    id="room-floor"
                    inputMode="numeric"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom((prev) => ({ ...prev, floor: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newRoom.status}
                    onValueChange={(value) => setNewRoom((prev) => ({ ...prev, status: value as RoomStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="cleaning">Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="room-price">Rate (per night)</Label>
                  <Input
                    id="room-price"
                    inputMode="decimal"
                    value={newRoom.price}
                    onChange={(e) => setNewRoom((prev) => ({ ...prev, price: e.target.value }))}
                  />
                </div>
              </div>

              {newRoom.status === "occupied" && (
                <div className="space-y-2">
                  <Label htmlFor="room-guest">Guest (optional)</Label>
                  <Input
                    id="room-guest"
                    placeholder="Guest name"
                    value={newRoom.guest}
                    onChange={(e) => setNewRoom((prev) => ({ ...prev, guest: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="room-image">Room Image (optional)</Label>
                <Input
                  id="room-image"
                  type="file"
                  accept="image/*"
                  onChange={handleSelectRoomImage}
                />
                {newRoomImagePreview && (
                  <img
                    src={newRoomImagePreview}
                    alt="Room preview"
                    className="h-28 w-full rounded-md object-cover border"
                  />
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canSubmitNewRoom || isUploadingImage}>
                  {isUploadingImage ? "Uploading..." : "Add Room"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Rooms</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{counts.total}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{counts.available}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{counts.occupied}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Out of Service</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{counts.maintenance + counts.cleaning}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(["all", "available", "occupied", "maintenance", "cleaning"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((room) => {
          const config = statusConfig[room.status];
          return (
            <Card key={room.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                {room.imageUrl && (
                  <div className="mb-3 overflow-hidden rounded-md border">
                    <img
                      src={room.imageUrl}
                      alt={`Room ${room.number}`}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <BedDouble className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Room {room.number}</p>
                      <p className="text-xs text-muted-foreground">{room.type}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Floor</span>
                    <span className="font-medium text-foreground">{room.floor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span className="font-medium text-foreground">{formatINR(room.price)}/night</span>
                  </div>
                  {room.guest && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guest</span>
                      <span className="font-medium text-foreground">{room.guest}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Rooms;
