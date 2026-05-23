import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  clinic_name: string;
  specialty: string;
  license_no: string;
  avatar_url: string | null;
  created_at: string;
}

export type ProfileUpdates = Partial<
  Pick<UserProfile, "full_name" | "clinic_name" | "specialty" | "license_no">
>;

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    if (error) console.error("[profile] fetch failed:", error);
    setProfile((data as UserProfile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (updates: ProfileUpdates): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    const { error } = await supabase.from("users").update(updates).eq("id", user.id);
    if (error) {
      toast.error("Failed to save: " + error.message);
      setSaving(false);
      return false;
    }
    // Keep auth metadata in sync so the dashboard greeting uses the new name
    if (updates.full_name) {
      await supabase.auth.updateUser({ data: { full_name: updates.full_name } });
    }
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev));
    toast.success("Profile saved");
    setSaving(false);
    return true;
  };

  const uploadAvatar = async (file: File): Promise<void> => {
    if (!user) return;
    setUploading(true);

    // Store as {user_id}/avatar (fixed path → upsert replaces previous)
    const storagePath = `${user.id}/avatar`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(storagePath, file, { contentType: file.type, upsert: true });

    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(storagePath);

    const { error: dbErr } = await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    if (dbErr) {
      toast.error("Failed to save avatar: " + dbErr.message);
      setUploading(false);
      return;
    }

    // Sync into auth metadata so Topbar can read it without a DB call
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

    // Cache-bust so the img element reloads even though the URL is the same
    setProfile((prev) =>
      prev ? { ...prev, avatar_url: `${publicUrl}?t=${Date.now()}` } : prev
    );
    toast.success("Avatar updated");
    setUploading(false);
  };

  const changePassword = async (
    newPassword: string,
    confirmPassword: string
  ): Promise<boolean> => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return false;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error("Password change failed: " + error.message);
      return false;
    }
    toast.success("Password changed successfully");
    return true;
  };

  return { profile, loading, saving, uploading, updateProfile, uploadAvatar, changePassword };
}
