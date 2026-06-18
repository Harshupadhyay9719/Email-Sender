import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, AlertTriangle, Loader2, Mail, ShieldCheck, Zap, CheckCircle2, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Captcha states
  const [captchaTicked, setCaptchaTicked] = useState(false);
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const handleCaptchaClick = () => {
    if (captchaTicked) {
      setCaptchaTicked(false);
      return;
    }
    setCaptchaLoading(true);
    setTimeout(() => {
      setCaptchaLoading(false);
      setCaptchaTicked(true);
    }, 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!captchaTicked) {
      setError('Please verify that you are not a robot.');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12 bg-[#f8fafc] text-slate-900 font-sans antialiased">
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(0.5deg); }
        }
        @keyframes floatDelayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(-0.5deg); }
        }
        @keyframes flowLeftToRight {
          0% { left: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: floatDelayed 6s ease-in-out infinite;
          animation-delay: 3s;
        }
        .animate-flow-fast {
          animation: flowLeftToRight 2s linear infinite;
        }
        .animate-flow-delayed {
          animation: flowLeftToRight 2s linear infinite;
          animation-delay: 1s;
        }
      `}</style>

      {/* Left Column: Form Panel (span 5) */}
      <div className="lg:col-span-5 flex flex-col justify-center px-6 py-12 sm:px-12 xl:px-16 bg-white border-r border-slate-200/80 relative overflow-hidden shadow-sm">
        {/* Soft Decorative Ambient Glows */}
        <div className="absolute top-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-85 h-85 bg-cyan-200/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="mx-auto w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col items-start">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-cyan-500 text-white shadow-md shadow-primary/10">
              <Send className="h-5.5 w-5.5" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
              ApexReach
            </h2>
            <p className="mt-2 text-sm text-slate-500 font-medium">
              B2B Multi-Contact Campaign Automation & Outreach
            </p>
          </div>

          <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl shadow-xl shadow-slate-100/45">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-800">Sign In</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your credentials to access operations</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-650">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-550" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="email">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@test.com"
                  required
                  className="h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/15 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700" htmlFor="password">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-10 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/15 rounded-lg"
                />
              </div>

              {/* Mock reCAPTCHA verification */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm mt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCaptchaClick}
                    disabled={captchaLoading}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-all duration-200",
                      captchaTicked
                        ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                        : "border-slate-300 bg-slate-50 hover:border-slate-400"
                    )}
                  >
                    {captchaLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                    ) : captchaTicked ? (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : null}
                  </button>
                  <span className="text-xs font-medium text-slate-750 select-none cursor-pointer" onClick={handleCaptchaClick}>
                    I am not a robot
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/ad/RecaptchaLogo.svg"
                    alt="reCAPTCHA logo"
                    className="h-7 w-7"
                  />
                  <span className="text-xs text-slate-505 mt-0.5 select-none font-medium">Privacy - Terms</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/15 transition-all duration-200 font-semibold rounded-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </div>

              <div className="text-center text-xs text-slate-500 mt-4">
                Don't have an account?{' '}
                <Link to="/register" className="font-bold text-primary hover:text-primary/80 hover:underline transition-all duration-150">
                  Register
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Right Column: Visual Showcase (span 7) */}
      <div className="hidden lg:col-span-7 lg:flex flex-col justify-between p-12 bg-slate-50/50 relative overflow-hidden">
        {/* Soft Blur Glows */}
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-cyan-200/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Info Header */}
        <div className="relative z-10 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400 uppercase">ApexReach Enterprise</span>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">Systems Online</span>
          </div>
        </div>

        {/* Gmail Logo Integration Banner & Feature Stack */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center space-y-10">
          
          {/* Gmail integration callout (No external image) */}
          <div className="max-w-lg w-full bg-white/85 border border-slate-200/80 rounded-2xl p-5 shadow-lg shadow-slate-100/30 backdrop-blur-sm flex items-center gap-4 transition-all duration-300 hover:scale-[1.01]">
            <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-red-500/10 to-amber-500/10 border border-red-200/50 dark:border-red-800/30">
              <Mail className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-800">Native Gmail OAuth Integration</h4>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-xs hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">Verified API</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal font-medium">
                Log in and securely connect your G-Suite work accounts. Alternates sends dynamically across multiple inboxes to maximize delivery rate.
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-lg">
            {/* Upper Left Floating Card */}
            <div className="absolute -left-12 -top-16 z-30 w-44 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-float-slow">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800">Deliverability Engine</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                Multi-inbox rotation sends outreach cleanly with high reputation mapping.
              </p>
            </div>

            {/* Central Engine Visual & Real-time Delivery Pipeline (Replaced images) */}
            <div className="relative z-20 w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-primary animate-pulse" />
                    <h4 className="text-xs font-bold text-slate-800">Active Delivery Pipeline</h4>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Automated multi-inbox rotation</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold hover:bg-primary/15">
                  Live Sending
                </Badge>
              </div>

              {/* Dynamic Queue animation path */}
              <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-150 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center pointer-events-none px-12">
                  <div className="w-full h-0.5 bg-gradient-to-r from-teal-400 via-primary to-cyan-400 opacity-20" />
                  <span className="absolute h-1.5 w-1.5 rounded-full bg-teal-400 animate-flow-fast" />
                  <span className="absolute h-1.5 w-1.5 rounded-full bg-primary animate-flow-delayed" />
                </div>

                <div className="flex items-center justify-between relative z-10">
                  {/* Senders */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex -space-x-1.5">
                      <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-[8px] font-bold text-white border border-white">S1</div>
                      <div className="h-6 w-6 rounded-full bg-sky-500 flex items-center justify-center text-[8px] font-bold text-white border border-white">S2</div>
                      <div className="h-6 w-6 rounded-full bg-violet-500 flex items-center justify-center text-[8px] font-bold text-white border border-white">S3</div>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Inboxes</span>
                  </div>

                  {/* Sending hub */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/20 animate-pulse">
                    <Zap className="h-4.5 w-4.5 text-white" />
                  </div>

                  {/* Delivered check */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Delivered</span>
                  </div>
                </div>
              </div>

              {/* Metric Blocks Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Inbox Rotation</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-0.5">Multi-Sender</p>
                  </div>
                  <span className="text-[8px] text-slate-500 font-semibold leading-tight">Alternates sending dynamically</span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Direct API</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-0.5">Google OAuth</p>
                  </div>
                  <span className="text-[8px] text-slate-500 font-semibold leading-tight">Secure OAuth verification</span>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 flex flex-col justify-between min-h-[72px]">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reputation</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-0.5">Safety Guard</p>
                  </div>
                  <span className="text-[8px] text-slate-500 font-semibold leading-tight">Monitors bounces & retries</span>
                </div>
              </div>
            </div>

            {/* Lower Left Floating Card */}
            <div className="absolute -left-8 -bottom-16 z-30 w-48 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md animate-float-delayed">
              <div className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-slate-800">Real-Time Metrics</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-normal">
                Instant delivery statistics and open rate alerts direct from Gmail API.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>Secure AES-256 Auth</span>
          <span>© 2026 ApexReach, Inc.</span>
        </div>
      </div>
    </div>
  );
}
