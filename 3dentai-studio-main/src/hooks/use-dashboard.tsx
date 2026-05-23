import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export interface DashboardStats {
  totalPatients: number;
  totalRecons: number;
  avgAccuracy: number;
  completedRecons: number;
  patientsTrend: number[];
  reconsTrend: number[];
  accuracyTrend: number[];
  completedTrend: number[];
  patientsThisMonth: number;
  reconsThisMonth: number;
  completedThisMonth: number;
}

export interface RecentRecon {
  id: string;
  patient_name: string;
  status: string;
  confidence_score: number;
  created_at: string;
}

export interface WeeklyUsage {
  day: string;
  scans: number;
  completed: number;
}

export interface MonthlyPerf {
  month: string;
  accuracy: number;
}

export interface ActivityItem {
  text: string;
  time: string;
  type: "completed" | "failed" | "started";
}

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const EMPTY_STATS: DashboardStats = {
  totalPatients: 0, totalRecons: 0, avgAccuracy: 0, completedRecons: 0,
  patientsTrend: [0,0,0,0,0,0,0], reconsTrend: [0,0,0,0,0,0,0],
  accuracyTrend: [0,0,0,0,0,0,0], completedTrend: [0,0,0,0,0,0,0],
  patientsThisMonth: 0, reconsThisMonth: 0, completedThisMonth: 0,
};

export function useDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats]             = useState<DashboardStats>(EMPTY_STATS);
  const [recentRecons, setRecentRecons] = useState<RecentRecon[]>([]);
  const [weeklyUsage, setWeeklyUsage]   = useState<WeeklyUsage[]>([]);
  const [perfData, setPerfData]         = useState<MonthlyPerf[]>([]);
  const [activity, setActivity]         = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    (async () => {
      setLoading(true);
      try {
        // Fetch patients + all reconstructions in parallel
        const [patientsRes, reconsRes, recentRes] = await Promise.all([
          supabase.from("patients").select("id, created_at").eq("user_id", user.id),
          supabase.from("reconstructions").select("id, patient_id, status, confidence_score, created_at"),
          supabase.from("reconstructions").select("*").order("created_at", { ascending: false }).limit(6),
        ]);

        type PRow = { id: string; created_at: string };
        type RRow = { id: string; patient_id: string; status: string; confidence_score: number; created_at: string };

        const patients  = (patientsRes.data  ?? []) as PRow[];
        const recons    = (reconsRes.data    ?? []) as RRow[];
        const recentRaw = (recentRes.data    ?? []) as RRow[];

        // Resolve patient names for recent rows
        const pIds = [...new Set(recentRaw.map((r) => r.patient_id))];
        const pMap: Record<string, string> = {};
        if (pIds.length) {
          const { data: pData } = await supabase
            .from("patients").select("id, patient_name").eq("user_id", user.id).in("id", pIds);
          for (const p of (pData ?? []) as { id: string; patient_name: string }[])
            pMap[p.id] = p.patient_name;
        }

        // Also need names for activity feed
        const allPIds = [...new Set(recons.map((r) => r.patient_id))];
        const allPMap: Record<string, string> = { ...pMap };
        const missing = allPIds.filter((id) => !allPMap[id]);
        if (missing.length) {
          const { data: mData } = await supabase
            .from("patients").select("id, patient_name").eq("user_id", user.id).in("id", missing);
          for (const p of (mData ?? []) as { id: string; patient_name: string }[])
            allPMap[p.id] = p.patient_name;
        }

        // ── Derived values ───────────────────────────────────────────────
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const completed        = recons.filter((r) => r.status === "completed");
        const avgAccuracy      = completed.length
          ? completed.reduce((s, r) => s + r.confidence_score, 0) / completed.length : 0;
        const patientsThisMonth = patients.filter((p) => p.created_at >= monthStart).length;
        const reconsThisMonth   = recons.filter((r) => r.created_at >= monthStart).length;
        const completedThisMonth = completed.filter((r) => r.created_at >= monthStart).length;

        // Trend sparklines — last 7 data points
        // Patients: cumulative count per week
        const patientsTrend = Array.from({ length: 7 }, (_, i) => {
          const cutoff = new Date(now);
          cutoff.setDate(now.getDate() - (6 - i) * 7);
          return patients.filter((p) => new Date(p.created_at) <= cutoff).length;
        });

        // Recons: count per day for last 7 days
        const reconsTrend = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - i));
          const prefix = d.toISOString().slice(0, 10);
          return recons.filter((r) => r.created_at.startsWith(prefix)).length;
        });

        // Accuracy: last 7 completed confidence scores
        const accuracyTrend = [...completed.slice(-7).map((r) => r.confidence_score)];
        while (accuracyTrend.length < 7) accuracyTrend.unshift(0);

        // Completed: cumulative per week
        const completedTrend = Array.from({ length: 7 }, (_, i) => {
          const cutoff = new Date(now);
          cutoff.setDate(now.getDate() - (6 - i) * 7);
          return completed.filter((r) => new Date(r.created_at) <= cutoff).length;
        });

        // ── Recent reconstructions table ─────────────────────────────────
        const recentRecons: RecentRecon[] = recentRaw.map((r) => ({
          id: r.id,
          patient_name: pMap[r.patient_id] ?? "Unknown",
          status: r.status,
          confidence_score: r.confidence_score,
          created_at: r.created_at,
        }));

        // ── Weekly usage chart (last 7 days) ─────────────────────────────
        const weeklyUsage: WeeklyUsage[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - i));
          const prefix = d.toISOString().slice(0, 10);
          const dayRecons = recons.filter((r) => r.created_at.startsWith(prefix));
          return {
            day: DAYS[d.getDay()],
            scans: dayRecons.length,
            completed: dayRecons.filter((r) => r.status === "completed").length,
          };
        });

        // ── Monthly accuracy chart (last 12 months) ───────────────────────
        const perfData: MonthlyPerf[] = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now);
          d.setMonth(d.getMonth() - (11 - i));
          const prefix = d.toISOString().slice(0, 7); // "YYYY-MM"
          const monthDone = completed.filter((r) => r.created_at.startsWith(prefix));
          const avg = monthDone.length
            ? monthDone.reduce((s, r) => s + r.confidence_score, 0) / monthDone.length : 0;
          return { month: MONTHS[d.getMonth()], accuracy: parseFloat(avg.toFixed(1)) };
        });

        // ── Activity feed (latest 8 events) ─────────────────────────────
        const activity: ActivityItem[] = recons.slice(0, 8).map((r) => {
          const name = allPMap[r.patient_id] ?? "Unknown patient";
          const time = relativeTime(r.created_at);
          if (r.status === "completed")
            return { text: `Reconstruction for ${name} completed (${r.confidence_score.toFixed(1)}% confidence)`, time, type: "completed" };
          if (r.status === "failed")
            return { text: `Reconstruction for ${name} failed`, time, type: "failed" };
          return { text: `New scan uploaded for ${name}`, time, type: "started" };
        });

        setStats({
          totalPatients: patients.length, totalRecons: recons.length,
          avgAccuracy: parseFloat(avgAccuracy.toFixed(1)),
          completedRecons: completed.length,
          patientsTrend, reconsTrend, accuracyTrend, completedTrend,
          patientsThisMonth, reconsThisMonth, completedThisMonth,
        });
        setRecentRecons(recentRecons);
        setWeeklyUsage(weeklyUsage);
        setPerfData(perfData);
        setActivity(activity);
      } catch (err) {
        console.error("[dashboard] fetch failed:", err);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { stats, recentRecons, weeklyUsage, perfData, activity, loading };
}
