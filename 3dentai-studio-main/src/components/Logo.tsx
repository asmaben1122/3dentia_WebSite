import logoDefault from "@/assets/logo.png";
import logoOnBlue from "@/assets/logo-on-blue.png";

export function Logo({ size = "md", variant = "default" }: { size?: "sm" | "md" | "lg"; variant?: "default" | "on-blue" }) {
  const dim = size === "sm" ? "h-12" : size === "lg" ? "h-20" : "h-14";
  const src = variant === "on-blue" ? logoOnBlue : logoDefault;
  return (
    <div className="flex items-center">
      <img src={src} alt="3DentAI logo" className={`${dim} w-auto object-contain`} />
    </div>
  );
}
