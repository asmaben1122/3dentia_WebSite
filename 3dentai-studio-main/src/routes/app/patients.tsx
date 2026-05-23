import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { usePatients, type Patient, type PatientCreate } from "@/hooks/use-patients";

export const Route = createFileRoute("/app/patients")({
  component: Patients,
});

const genderBadge: Record<string, string> = {
  Male: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  Female: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  Other: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const emptyForm: PatientCreate = { patient_name: "", age: 0, gender: "Male", notes: "" };

function Patients() {
  const { patients, loading, addPatient, updatePatient, deletePatient } = usePatients();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientCreate>(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = patients.filter(
    (p) =>
      p.patient_name.toLowerCase().includes(q.toLowerCase()) ||
      p.gender.toLowerCase().includes(q.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm);
    setAddOpen(true);
  };

  const openEdit = (p: Patient) => {
    setForm({
      patient_name: p.patient_name,
      age: p.age,
      gender: p.gender,
      notes: p.notes ?? "",
    });
    setEditPatient(p);
  };

  const handleSave = async () => {
    if (!form.patient_name.trim() || !form.age || !form.gender) return;
    setSaving(true);
    let ok = false;
    if (editPatient) {
      ok = await updatePatient(editPatient.id, form);
      if (ok) setEditPatient(null);
    } else {
      ok = await addPatient(form);
      if (ok) setAddOpen(false);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePatient(deleteId);
    setDeleteId(null);
  };

  const formValid = form.patient_name.trim().length > 0 && form.age > 0 && !!form.gender;

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Patients</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading…" : `${patients.length} active record${patients.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-xl gradient-navy-cyan text-white ai-glow">
          <Plus className="h-4 w-4" /> Add patient
        </Button>
      </div>

      {/* Table card */}
      <Card className="rounded-2xl border-border/60 soft-shadow overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or gender…"
              className="pl-9 h-10 rounded-xl bg-secondary border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase text-muted-foreground bg-secondary/40">
                <th className="text-left font-medium px-4 py-3">Patient</th>
                <th className="text-left font-medium px-4 py-3">Age</th>
                <th className="text-left font-medium px-4 py-3">Gender</th>
                <th className="text-left font-medium px-4 py-3">Notes</th>
                <th className="text-left font-medium px-4 py-3">Added</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {q ? "No patients match your search." : "No patients yet. Click \"Add patient\" to get started."}
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((p) => (
                  <tr key={p.id} className="border-t border-border/40 hover:bg-secondary/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs gradient-navy-cyan text-white">
                            {p.patient_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{p.patient_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.age} yrs</td>
                    <td className="px-4 py-3">
                      <Badge className={`rounded-full border text-xs ${genderBadge[p.gender] ?? "bg-secondary"}`}>
                        {p.gender}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[260px] truncate">
                      {p.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && (
          <div className="p-4 border-t border-border text-sm text-muted-foreground">
            Showing {filtered.length} of {patients.length} patients
          </div>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog
        open={addOpen || !!editPatient}
        onOpenChange={(open) => {
          if (!open) { setAddOpen(false); setEditPatient(null); }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editPatient ? "Edit patient" : "Add new patient"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pname">Full name *</Label>
              <Input
                id="pname"
                placeholder="Boutheyna Hammami"
                value={form.patient_name}
                onChange={(e) => setForm((f) => ({ ...f, patient_name: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="page">Age *</Label>
                <Input
                  id="page"
                  type="number"
                  min={0}
                  max={130}
                  placeholder="25"
                  value={form.age || ""}
                  onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || 0 }))}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gender *</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pnotes">Clinical notes</Label>
              <Textarea
                id="pnotes"
                placeholder="Dental history, conditions, treatment plans…"
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => { setAddOpen(false); setEditPatient(null); }}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl gradient-navy-cyan text-white"
              onClick={handleSave}
              disabled={saving || !formValid}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editPatient ? "Save changes" : "Add patient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the patient record and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
