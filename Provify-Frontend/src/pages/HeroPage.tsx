import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bug, Shield, CheckCircle, ArrowRight, Zap, Terminal, Cpu } from "lucide-react";

export default function HeroPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Navbar */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Shield className="h-8 w-8 text-emerald-400" />
              <div className="absolute inset-0 h-8 w-8 bg-emerald-400/20 blur-lg" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Provify</span>
          </div>
          <Button
            variant="outline"
            className="border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:text-white hover:border-zinc-600"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6 min-h-screen flex items-center">
        <div className="max-w-5xl mx-auto text-center">
          {/* Floating Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-emerald-400 text-sm mb-8 backdrop-blur-sm">
            <Zap className="h-4 w-4" />
            <span className="text-zinc-300">AI-Powered Bug Verification</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">NEW</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Verify </span>
            <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Bugs</span>
            <span className="text-white"> at Scale</span>
          </h1>
          
          {/* Subheading */}
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Provify uses <span className="text-emerald-400 font-medium">DroidRun</span> to automatically reproduce and verify bugs on real Android devices. 
            No more manual testing. Just results.
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-emerald-500 text-black font-semibold hover:bg-emerald-400 gap-2 px-8 shadow-lg shadow-emerald-500/20"
              onClick={() => navigate("/dashboard")}
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-zinc-700 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:text-white px-8"
              onClick={() => navigate("/bugs")}
            >
              View Bugs
            </Button>
          </div>

          {/* Terminal Preview */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/50 border-b border-zinc-700">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-zinc-500 font-mono">provify-cli</span>
              </div>
              <div className="p-4 font-mono text-sm text-left">
                <div className="text-zinc-500">$ provify verify --app com.example.app</div>
                <div className="text-emerald-400 mt-2">Connecting to device...</div>
                <div className="text-zinc-400 mt-1">Launching app: com.example.app</div>
                <div className="text-zinc-400 mt-1">Reproducing bug: "Login crash"</div>
                <div className="text-emerald-400 mt-2">Bug verified successfully</div>
                <div className="text-zinc-500 mt-1">Steps: 3 | Time: 12.4s | Device: Pixel 7</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-zinc-400 max-w-xl mx-auto">Three simple steps to automated bug verification</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Bug className="h-6 w-6" />}
              title="Report Bugs"
              description="Add bugs with app package name and description. We handle the rest."
              color="emerald"
              step={1}
            />
            <FeatureCard
              icon={<Cpu className="h-6 w-6" />}
              title="Auto Verify"
              description="DroidRun reproduces bugs on real devices using AI-powered automation."
              color="cyan"
              step={2}
            />
            <FeatureCard
              icon={<CheckCircle className="h-6 w-6" />}
              title="Get Results"
              description="Verified bugs with reproduction steps, observations, and status updates."
              color="emerald"
              step={3}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 py-24 px-6 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <StatCard value="10x" label="Faster Verification" color="emerald" />
            <StatCard value="24/7" label="Automated Testing" color="cyan" />
            <StatCard value="100%" label="Reproducible" color="emerald" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto text-center">
          <Terminal className="h-12 w-12 mx-auto mb-6 text-emerald-400" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to automate bug verification?</h2>
          <p className="text-zinc-400 mb-8">Start verifying bugs in minutes, not hours.</p>
          <Button
            size="lg"
            className="bg-emerald-500 text-black font-semibold hover:bg-emerald-400 gap-2 px-8 shadow-lg shadow-emerald-500/20"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-zinc-500 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <span>Provify</span>
          </div>
          <span>Built with DroidRun</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description, 
  color, 
  step 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: "emerald" | "cyan";
  step: number;
}) {
  const colorClasses = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  
  return (
    <div className="group relative p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:bg-zinc-900/80">
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
        {step}
      </div>
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color]} mb-4 border`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string; label: string; color: "emerald" | "cyan" }) {
  const textColor = color === "emerald" ? "text-emerald-400" : "text-cyan-400";
  return (
    <div className="p-6">
      <div className={`text-4xl md:text-5xl font-bold ${textColor} mb-2`}>{value}</div>
      <div className="text-zinc-400 text-sm">{label}</div>
    </div>
  );
}
