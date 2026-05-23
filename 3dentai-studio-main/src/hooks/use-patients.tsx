import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface Patient {
  id: string;
  user_id: string;
  patient_name: string;
  age: number;
  gender: string;
  notes: string | null;
  created_at: string;
}

export interface PatientCreate {
  patient_name: string;
  age: number;
  gender: string;
  notes?: string;
}

export function usePatients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load patients: " + error.message);
    } else {
      setPatients(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (payload: PatientCreate): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from("patients")
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return false;
    }
    setPatients((prev) => [data, ...prev]);
    toast.success("Patient added successfully");
    return true;
  };

  const updatePatient = async (id: string, payload: Partial<PatientCreate>): Promise<boolean> => {
    const { data, error } = await supabase
      .from("patients")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return false;
    }
    setPatients((prev) => prev.map((p) => (p.id === id ? data : p)));
    toast.success("Patient updated");
    return true;
  };

  const deletePatient = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("patients").delete().eq("id", id);

    if (error) {
      toast.error(error.message);
      return false;
    }
    setPatients((prev) => prev.filter((p) => p.id !== id));
    toast.success("Patient removed");
    return true;
  };

  return { patients, loading, addPatient, updatePatient, deletePatient, refetch: fetchPatients };
}
