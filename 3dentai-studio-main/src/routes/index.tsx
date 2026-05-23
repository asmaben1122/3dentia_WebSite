import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Brain, Box, FileDown,
  Zap, ShieldCheck, Cloud, Activity, Eye, Gauge, Mail, MapPin,
  Twitter, Github, Linkedin, ArrowRight, Play,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3DentAI — AI-Powered 3D Dental Reconstruction" },
      { name: "description", content: "Transform 2D panoramic dental scans into intelligent 3D reconstructions with medical-grade AI. Built for surgeons, dentists, and radiologists." },
      { property: "og:title", content: "3DentAI — AI-Powered 3D Dental Reconstruction" },
      { property: "og:description", content: "Deep-learning reconstruction of highly detailed 3D dental structures from panoramic radiographs." },
    ],
  }),
  component: LandingPage,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Home", href: "#home" },
    { label: "Features", href: "#features" },
    { label: "Services", href: "#services" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ${scrolled ? "" : ""}`}>
        <div className={`flex items-center justify-between rounded-2xl px-4 sm:px-6 py-3 transition-all duration-300 ${
          scrolled ? "glass border border-border/60 soft-shadow" : "bg-transparent"
        }`}>
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/60"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth/signin">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Login</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="gradient-navy-cyan text-white border-0 ai-glow">
                Get Started
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="home" className="relative pt-40 pb-28 overflow-hidden">
      {/* ── Background blobs & grid ── */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[700px] w-[700px] rounded-full bg-accent/14 blur-3xl" />
        <div className="absolute top-40 -left-24 h-[420px] w-[420px] rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute top-24 -right-24 h-[480px] w-[480px] rounded-full bg-accent/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.65 0.15 215 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.65 0.15 215 / 0.08) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 55%, transparent 88%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="flex flex-col items-center gap-8"
        >
          {/* ── Live badge ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium text-foreground/75 backdrop-blur-sm shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            AI Reconstruction Engine v3.2 — Now Live
          </motion.div>

          {/* ── Hero title ── */}
          <h1 className="tracking-tight">
            {/* Line 1 — small label feel */}
            <span className="block text-lg sm:text-xl font-semibold text-accent uppercase tracking-[0.18em] mb-3">
              Dental AI Platform
            </span>

            {/* Line 2 — main bold statement */}
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.04] text-foreground">
              3D Reconstruction
            </span>

            {/* Line 3 — gradient accent line */}
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.04] text-gradient">
              Powered by AI
            </span>

            {/* Line 4 — supporting subtitle inside the title */}
            <span className="block text-xl sm:text-2xl font-medium text-muted-foreground mt-4 leading-snug">
              from Panoramic Radiographs
            </span>
          </h1>

          {/* ── Description ── */}
          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Deep-learning AI turns a single panoramic X-ray into a precise,
            interactive 3D dental model in under 90 seconds — built for
            surgeons, dentists, and radiologists.
          </p>

          {/* ── CTAs ── */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/auth/signup">
              <Button size="lg" className="gradient-navy-cyan text-white border-0 ai-glow h-13 px-8 text-base">
                Start Reconstruction
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-13 px-8 text-base">
              <Play className="mr-2 h-4 w-4" />
              Watch Demo
            </Button>
          </div>

          {/* ── Stats row ── */}
          <div className="flex flex-wrap justify-center gap-x-14 gap-y-5 pt-8 mt-2 border-t border-border/50 w-full max-w-xl">
            {[
              { value: "98.4%",  label: "AI Confidence" },
              { value: "< 90s", label: "Processing Time" },
              { value: "248K",  label: "Mesh Vertices" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className="max-w-2xl mx-auto text-center mb-14"
    >
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
        <span className="h-1 w-1 rounded-full bg-accent" />
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-lg">{subtitle}</p>}
    </motion.div>
  );
}

function Services() {
  const services = [
    {
      icon: Brain,
      title: "AI Reconstruction",
      desc: "Generate accurate 3D dental reconstructions from panoramic images using deep learning.",
    },
    {
      icon: Box,
      title: "3D Visualization",
      desc: "Interactive real-time 3D visualization with advanced medical rendering controls.",
    },
    {
      icon: FileDown,
      title: "Export ",
      desc: "Export STL and voxel 3D object.",
    },
  ];
  return (
    <section id="services" className="py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Our Services"
          title="Built for modern healthcare"
          subtitle="AI-Powered 3D Dental Reconstruction from Panoramic Radiographs."
        />
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className="group relative rounded-2xl border border-border bg-card p-8 soft-shadow overflow-hidden"
            >
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-12 w-12 rounded-xl gradient-navy-cyan flex items-center justify-center ai-glow">
                <s.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
              <div className="mt-6 inline-flex items-center text-sm font-medium text-accent">
                Learn more
                <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


function Features() {
  const features = [
    { icon: Brain, title: "AI-powered reconstruction", desc: "State-of-the-art neural networks for volumetric inference." },
    { icon: Zap, title: "Fast processing", desc: "Reconstruct full jaw models in under 90 seconds on GPU." },
    { icon: ShieldCheck, title: "Medical-grade precision", desc: "Sub-millimeter accuracy validated against CBCT ground truth." },
    { icon: ShieldCheck, title: "Secure patient data", desc: "HIPAA-aligned encryption and audit trails by default." },
    { icon: Cloud, title: "Cloud-based platform", desc: "Access from any device — no local GPU required." },
    { icon: FileDown, title: "STL export support", desc: "Industry-standard meshes ready for surgical planning." },
    { icon: Eye, title: "Interactive 3D viewer", desc: "Rotate, slice, and measure reconstructions in real time." },
    { icon: Activity, title: "Real-time progress tracking", desc: "Live pipeline telemetry and confidence scoring." },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Features"
          title="Everything your imaging team needs"
          subtitle="A complete toolkit for AI-driven dental reconstruction, designed with clinicians."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-card p-6 soft-shadow"
            >
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="py-24 bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
            <span className="h-1 w-1 rounded-full bg-accent" />
            Contact
          </div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Talk to our clinical team
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            Our medical support specialists work with hospitals, research labs, and dental practices to deploy 3DentAI safely and effectively.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">3DentaiEntrep@gmail.com</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-sm font-medium">Headquarters</div>
                <div className="text-sm text-muted-foreground">Algeria, Constantine, Ali Mendjli</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center">
                <Gauge className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-sm font-medium">Medical support</div>
                <div className="text-sm text-muted-foreground">24/7 response for partnered hospitals and research labs.</div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          onSubmit={(e) => e.preventDefault()}
          className="glass border border-border rounded-3xl p-8 soft-shadow"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input className="mt-1.5" placeholder="" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input type="email" className="mt-1.5" placeholder="" />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea className="mt-1.5 min-h-32" placeholder="Tell us about your workflow…" />
            </div>
            <Button type="submit" size="lg" className="w-full gradient-navy-cyan text-white border-0 ai-glow">
              Send Message
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <Logo />
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              AI-Powered 3D Dental Reconstruction from Panoramic Radiographs.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent transition-colors">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {[
            { title: "Navigation", links: ["Home", "Features", "Services", "Contact"] },
            { title: "Services", links: ["AI Reconstruction", "3D Visualization", "Export ", "API Access"] },
            { title: "Legal", links: ["Privacy Policy", "Terms of Service", "HIPAA", "Security"] },
          ].map((col) => (
            <div key={col.title}>
              <div className="text-sm font-semibold">{col.title}</div>
              <ul className="mt-4 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} 3DentAI, Inc. All rights reserved.</div>
          <div className="text-xs text-muted-foreground">Made for clinicians, researchers, and surgeons.</div>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Services />
        <Features />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
