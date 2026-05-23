import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun,
  User, Building2, Bell, Palette, KeyRound, Shield,
  Camera, Loader2, Eye, EyeOff, Check,
} from "lucide-react";

// ── Notification preferences (persisted in localStorage) ────────────────────
const NOTIF_KEY = "3dentai_notifications";
const NOTIF_ITEMS = [
  { key: "recon_done",    label: "Reconstruction completed", desc: "When an AI job finishes" },
  { key: "action_needed", label: "Action needed alerts",     desc: "Scans requiring attention" },
  { key: "weekly_report", label: "Weekly performance report", desc: "Every Monday morning" },
  { key: "product_news",  label: "Product updates",          desc: "New features & improvements" },
] as const;

type NotifKey = (typeof NOTIF_ITEMS)[number]["key"];
type NotifPrefs = Record<NotifKey, boolean>;

const DEFAULT_NOTIFS: NotifPrefs = {
  recon_done: true, action_needed: true, weekly_report: true, product_news: false,
};

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...DEFAULT_NOTIFS, ...JSON.parse(raw) } : DEFAULT_NOTIFS;
  } catch {
    return DEFAULT_NOTIFS;
  }
}

function useNotifPrefs() {
  const [prefs, setPrefs] = useState<NotifPrefs>(loadNotifPrefs);
  const toggle = (key: NotifKey) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  };
  return { prefs, toggle };
}

export const Route = createFileRoute("/app/settings")({
  component: Settings,
});

const sections = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "clinic",        label: "Clinic",        icon: Building2 },
  { id: "password",      label: "Password",      icon: KeyRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "theme",         label: "Appearance",    icon: Palette },
  { id: "security",      label: "Security",      icon: Shield },
];

// ── Avatar upload widget ─────────────────────────────────────────────────────
function AvatarUpload({
  src,
  initials,
  uploading,
  onFile,
}: {
  src: string | null;
  initials: string;
  uploading: boolean;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-5">
      <div className="relative group">
        <Avatar className="h-20 w-20 border-2 border-border shadow-sm">
          {src && <AvatarImage src={src} alt="Avatar" className="object-cover" />}
          <AvatarFallback className="gradient-navy-cyan text-white text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
          aria-label="Change avatar"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          JPEG, PNG or WebP · max 5 MB
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-lg mt-2 text-xs h-7"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</>
          ) : (
            <><Camera className="h-3 w-3" /> Change photo</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Password change form ─────────────────────────────────────────────────────
function PasswordSection({ saving, changePassword }: {
  saving: boolean;
  changePassword: (np: string, cp: string) => Promise<boolean>;
}) {
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);

  const mismatch   = confirmPw.length > 0 && newPw !== confirmPw;
  const tooShort   = newPw.length > 0 && newPw.length < 8;
  const canSubmit  = newPw.length >= 8 && newPw === confirmPw && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await changePassword(newPw, confirmPw);
    if (ok) { setNewPw(""); setConfirmPw(""); }
  };

  return (
    <Card id="password" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          You are signed in via Supabase Auth — enter a new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div className="space-y-2">
          <Label htmlFor="new-pw">New password</Label>
          <div className="relative">
            <Input
              id="new-pw"
              type={showNew ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Min. 8 characters"
              className="h-10 rounded-xl pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNew((v) => !v)}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {tooShort && (
            <p className="text-xs text-destructive">At least 8 characters required.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <div className="relative">
            <Input
              id="confirm-pw"
              type={showConf ? "text" : "password"}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Repeat new password"
              className="h-10 rounded-xl pr-10"
              autoComplete="new-password"
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConf((v) => !v)}
            >
              {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {mismatch && (
            <p className="text-xs text-destructive">Passwords do not match.</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl gradient-navy-cyan text-white ai-glow"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Update password"}
        </Button>
      </form>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function Settings() {
  const { user } = useAuth();
  const { profile, loading, saving, uploading, updateProfile, uploadAvatar, changePassword } =
    useProfile();
  const { theme, setTheme } = useTheme();
  const { prefs, toggle: toggleNotif } = useNotifPrefs();

  // Local controlled state for the profile form
  const [fullName,   setFullName]   = useState("");
  const [clinicName, setClinicName] = useState("");
  const [specialty,  setSpecialty]  = useState("");
  const [licenseNo,  setLicenseNo]  = useState("");
  const [formReady,  setFormReady]  = useState(false);

  // Populate form once profile loads
  if (!loading && profile && !formReady) {
    setFullName(profile.full_name ?? "");
    setClinicName(profile.clinic_name ?? "");
    setSpecialty(profile.specialty ?? "");
    setLicenseNo(profile.license_no ?? "");
    setFormReady(true);
  }

  const initials = (profile?.full_name ?? user?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ full_name: fullName, clinic_name: clinicName, specialty, license_no: licenseNo });
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile, clinic, and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar nav */}
        <Card className="p-2 rounded-2xl border-border/60 soft-shadow h-fit">
          <nav className="space-y-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-secondary transition-colors"
              >
                <s.icon className="h-4 w-4 text-muted-foreground" />
                {s.label}
              </a>
            ))}
          </nav>
        </Card>

        <div className="space-y-6">
          {/* ── Profile ── */}
          <Card id="profile" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-5">
            <h2 className="text-lg font-semibold">Profile</h2>

            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-5">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-7 w-24 mt-1" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <AvatarUpload
                  src={profile?.avatar_url ?? null}
                  initials={initials}
                  uploading={uploading}
                  onFile={uploadAvatar}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={user?.email ?? ""}
                      disabled
                      className="h-10 rounded-xl opacity-60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input
                      id="specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. Maxillofacial Surgery"
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license">License #</Label>
                    <Input
                      id="license"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      placeholder="e.g. MD-44291"
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl gradient-navy-cyan text-white ai-glow"
                  >
                    {saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          {/* ── Clinic ── */}
          <Card id="clinic" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-4">
            <h2 className="text-lg font-semibold">Clinic</h2>
            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-10 w-full rounded-xl" /></div>
                <div className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-10 w-full rounded-xl" /></div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinic-name">Organization</Label>
                  <Input
                    id="clinic-name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input defaultValue="UTC+00:00" className="h-10 rounded-xl" />
                </div>
              </div>
            )}
          </Card>

          {/* ── Password ── */}
          <PasswordSection saving={saving} changePassword={changePassword} />

          {/* ── Notifications ── */}
          <Card id="notifications" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Notifications</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Preferences saved locally — email delivery coming soon.
              </p>
            </div>
            {NOTIF_ITEMS.map((n, i) => (
              <div key={n.key}>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-sm">{n.label}</div>
                    <div className="text-xs text-muted-foreground">{n.desc}</div>
                  </div>
                  <Switch
                    checked={prefs[n.key]}
                    onCheckedChange={() => toggleNotif(n.key)}
                  />
                </div>
                {i < NOTIF_ITEMS.length - 1 && <Separator />}
              </div>
            ))}
          </Card>

          {/* ── Appearance / Theme ── */}
          <Card id="theme" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Choose how 3DentAI looks on your device.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`relative rounded-xl border-2 p-3 transition-all text-left ${
                    theme === t
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-border/80 hover:bg-secondary/50"
                  }`}
                >
                  {/* Mini preview */}
                  <div
                    className={`rounded-lg h-16 mb-2.5 overflow-hidden flex flex-col gap-1 p-1.5 ${
                      t === "dark" ? "bg-[#0f1117]" : "bg-[#f8f9fb]"
                    }`}
                  >
                    <div className={`rounded h-2 w-10 ${t === "dark" ? "bg-white/20" : "bg-black/10"}`} />
                    <div className={`rounded h-1.5 w-14 ${t === "dark" ? "bg-white/10" : "bg-black/6"}`} />
                    <div className="flex gap-1 mt-auto">
                      <div className="rounded h-3 w-6 bg-gradient-to-r from-[oklch(0.28_0.09_260)] to-[oklch(0.65_0.15_215)]" />
                      <div className={`rounded h-3 w-8 ${t === "dark" ? "bg-white/10" : "bg-black/8"}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {t === "light" ? (
                        <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium capitalize">{t}</span>
                    </div>
                    {theme === t && (
                      <div className="h-4 w-4 rounded-full bg-accent flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* ── Security ── */}
          <Card id="security" className="p-6 rounded-2xl border-border/60 soft-shadow space-y-4">
            <h2 className="text-lg font-semibold">Security</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium text-sm">Two-factor authentication</div>
                <div className="text-xs text-muted-foreground">
                  Add an extra layer of protection
                </div>
              </div>
              <Switch />
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">
                Account created:{" "}
                <span className="text-foreground font-medium">
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
