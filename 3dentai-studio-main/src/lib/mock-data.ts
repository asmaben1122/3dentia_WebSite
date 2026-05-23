export const stats = [
  { label: "Total Patients", value: 1284, delta: "+12.4%", trend: [12, 18, 14, 22, 19, 28, 32], icon: "users" },
  { label: "Reconstructions", value: 3492, delta: "+8.1%", trend: [40, 52, 48, 61, 58, 72, 80], icon: "layers" },
  { label: "AI Accuracy", value: "98.6%", delta: "+0.3%", trend: [95, 96, 96, 97, 97, 98, 98.6], icon: "sparkles" },
  { label: "Avg. Processing", value: "42s", delta: "-6s", trend: [60, 58, 55, 52, 50, 46, 42], icon: "timer" },
] as const;

export type ReconStatus = "Completed" | "Processing" | "Action Needed";

export interface Reconstruction {
  id: string;
  patient: string;
  date: string;
  status: ReconStatus;
  confidence: number;
}

export const reconstructions: Reconstruction[] = [
  { id: "RC-10293", patient: "Amelia Hayes", date: "2026-05-20", status: "Completed", confidence: 98 },
  { id: "RC-10292", patient: "Liam Carter", date: "2026-05-20", status: "Processing", confidence: 76 },
  { id: "RC-10291", patient: "Noah Patel", date: "2026-05-19", status: "Completed", confidence: 96 },
  { id: "RC-10290", patient: "Sofia Ramirez", date: "2026-05-19", status: "Action Needed", confidence: 62 },
  { id: "RC-10289", patient: "Olivia Chen", date: "2026-05-18", status: "Completed", confidence: 99 },
  { id: "RC-10288", patient: "Ethan Brown", date: "2026-05-18", status: "Completed", confidence: 94 },
];

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  lastScan: string;
  status: ReconStatus;
  confidence: number;
}

export const patients: Patient[] = [
  { id: "PT-0001", name: "Amelia Hayes", age: 34, sex: "F", lastScan: "2026-05-20", status: "Completed", confidence: 98 },
  { id: "PT-0002", name: "Liam Carter", age: 41, sex: "M", lastScan: "2026-05-20", status: "Processing", confidence: 76 },
  { id: "PT-0003", name: "Noah Patel", age: 28, sex: "M", lastScan: "2026-05-19", status: "Completed", confidence: 96 },
  { id: "PT-0004", name: "Sofia Ramirez", age: 52, sex: "F", lastScan: "2026-05-19", status: "Action Needed", confidence: 62 },
  { id: "PT-0005", name: "Olivia Chen", age: 37, sex: "F", lastScan: "2026-05-18", status: "Completed", confidence: 99 },
  { id: "PT-0006", name: "Ethan Brown", age: 46, sex: "M", lastScan: "2026-05-18", status: "Completed", confidence: 94 },
  { id: "PT-0007", name: "Mia Johnson", age: 31, sex: "F", lastScan: "2026-05-17", status: "Completed", confidence: 92 },
  { id: "PT-0008", name: "Lucas Garcia", age: 58, sex: "M", lastScan: "2026-05-17", status: "Action Needed", confidence: 71 },
];

export const aiActivity = [
  { time: "12:42", text: "Reconstruction RC-10293 completed (98% confidence)" },
  { time: "12:35", text: "Voxel generation started for RC-10292" },
  { time: "12:28", text: "Arch detection refined on RC-10291" },
  { time: "12:14", text: "Model checkpoint v4.2.1 loaded" },
  { time: "11:58", text: "Noise reduction enhanced via dental-net-v3" },
  { time: "11:40", text: "Batch import: 14 panoramic scans" },
];

export const weeklyUsage = [
  { day: "Mon", scans: 42, recon: 38 },
  { day: "Tue", scans: 51, recon: 47 },
  { day: "Wed", scans: 49, recon: 46 },
  { day: "Thu", scans: 63, recon: 58 },
  { day: "Fri", scans: 72, recon: 68 },
  { day: "Sat", scans: 31, recon: 28 },
  { day: "Sun", scans: 22, recon: 20 },
];

export const performanceData = Array.from({ length: 12 }).map((_, i) => ({
  month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
  accuracy: 93 + Math.sin(i / 2) * 2 + i * 0.2,
  speed: 60 - i * 1.4,
}));

export const pipelineSteps = [
  { name: "Noise Reduction", desc: "Adaptive denoising filter" },
  { name: "Contrast Enhancement", desc: "CLAHE histogram tuning" },
  { name: "Arch Detection", desc: "Dental arch landmark localization" },
  { name: "Voxel Generation", desc: "Depth-aware voxel inference" },
  { name: "3D Reconstruction", desc: "Volumetric mesh synthesis" },
  { name: "Mesh Refinement", desc: "Smoothing & topology cleanup" },
] as const;

export const imagingScans = Array.from({ length: 9 }).map((_, i) => ({
  id: `IMG-${1000 + i}`,
  patient: patients[i % patients.length].name,
  date: `2026-05-${20 - i}`,
  resolution: ["2480×1280", "2048×1024", "3072×1536"][i % 3],
  status: (["Completed", "Processing", "Action Needed"] as const)[i % 3],
}));

export const gpuUsage = Array.from({ length: 24 }).map((_, i) => ({
  hour: `${i}:00`,
  usage: 30 + Math.round(40 * Math.abs(Math.sin(i / 3))),
}));
