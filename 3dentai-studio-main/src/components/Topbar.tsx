import { useRef, useState, useEffect } from "react";
import { Bell, Search, Moon, Sun, Sparkles, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// ── Status badge styles (same as other pages) ───────────────────────────────
const statusStyles: Record<string, string> = {
  completed:      "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  reconstructing: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  preprocessing:  "bg-sky-500/10 text-sky-600 border-sky-500/20",
  pending:        "bg-secondary text-secondary-foreground border-border",
  failed:         "bg-red-500/10 text-red-600 border-red-500/20",
};
const statusLabel: Record<string, string> = {
  completed: "Completed", reconstructing: "Reconstructing",
  preprocessing: "Processing", pending: "Pending", failed: "Failed",
};

type PatientRow = { id: string; patient_name: string; age: number; gender: string };
type ReconRow   = { id: string; patient_id: string; status: string; confidence_score: number };

// ── Search bar ───────────────────────────────────────────────────────────────
function SearchBar() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [query,       setQuery]       = useState("");
  const [open,        setOpen]        = useState(false);
  const [searching,   setSearching]   = useState(false);
  const [patients,    setPatients]    = useState<PatientRow[]>([]);
  const [latestRecon, setLatestRecon] = useState<Record<string, ReconRow>>({});

  // Close when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2 || !user) {
      setPatients([]);
      setLatestRecon({});
      setOpen(false);
      return;
    }
    setOpen(true);
    setSearching(true);

    const timer = setTimeout(async () => {
      const { data: pData } = await supabase
        .from("patients")
        .select("id, patient_name, age, gender")
        .ilike("patient_name", `%${query}%`)
        .limit(6);

      const found = (pData ?? []) as PatientRow[];
      setPatients(found);

      if (found.length > 0) {
        const pIds = found.map((p) => p.id);
        const { data: rData } = await supabase
          .from("reconstructions")
          .select("id, patient_id, status, confidence_score, created_at")
          .in("patient_id", pIds)
          .order("created_at", { ascending: false });

        // Keep only the latest reconstruction per patient
        const map: Record<string, ReconRow> = {};
        for (const r of (rData ?? []) as (ReconRow & { created_at: string })[]) {
          if (!map[r.patient_id]) map[r.patient_id] = r;
        }
        setLatestRecon(map);
      } else {
        setLatestRecon({});
      }

      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, user]);

  const handleSelect = () => {
    setQuery("");
    setOpen(false);
    navigate({ to: "/app/patients" });
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && (setOpen(false), setQuery(""))}
        placeholder="Search patients…"
        className="pl-9 h-10 rounded-xl bg-secondary border-transparent focus-visible:border-ring"
      />

      {open && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50">
          {searching ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
            </div>
          ) : patients.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Users className="h-4 w-4 opacity-50" />
              No patients found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border bg-secondary/50">
                Patients
              </div>
              {patients.map((p) => {
                const recon = latestRecon[p.id];
                return (
                  <button
                    key={p.id}
                    onClick={handleSelect}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left"
                  >
                    <div className="h-8 w-8 rounded-full gradient-navy-cyan flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {initials(p.patient_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.patient_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.age}y · {p.gender}
                      </div>
                    </div>
                    {recon ? (
                      <Badge className={`text-xs rounded-full border shrink-0 ${statusStyles[recon.status] ?? ""}`}>
                        {statusLabel[recon.status] ?? recon.status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground shrink-0">No scans</span>
                    )}
                  </button>
                );
              })}
              <div className="border-t border-border px-3 py-2 bg-secondary/30">
                <button
                  onClick={handleSelect}
                  className="text-xs text-accent hover:underline font-medium"
                >
                  View all patients →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Topbar ───────────────────────────────────────────────────────────────────
export function Topbar() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const displayName = fullName || user?.email?.split("@")[0] || "Doctor";
  const initials    = fullName
    ? fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 glass border-b border-border h-16 flex items-center px-4 sm:px-6 gap-3">
      <SearchBar />

      <div className="flex items-center gap-2 ml-auto">
        <Badge className="hidden md:inline-flex gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Sparkles className="h-3 w-3" />
          AI ACTIVE
        </Badge>

        <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" className="rounded-xl relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 ring-ring pl-1">
              <Avatar className="h-9 w-9 border-2 border-border">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                )}
                <AvatarFallback className="gradient-navy-cyan text-white text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:block text-sm font-medium max-w-[120px] truncate pr-1">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 py-1">
                <Avatar className="h-8 w-8 border border-border shrink-0">
                  {avatarUrl && (
                    <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                  )}
                  <AvatarFallback className="gradient-navy-cyan text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
              Profile &amp; Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
