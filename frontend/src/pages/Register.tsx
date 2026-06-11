import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await register(email, password, firstName, lastName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Send className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">Create Account</h2>
          <p className="mt-2 text-center text-sm text-slate-400">Start your outreach campaigns today</p>
        </div>
        <Card className="border-slate-800 bg-slate-950/80 text-white backdrop-blur shadow-2xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Register</CardTitle>
            <CardDescription className="text-slate-400">Fill in your details to create an account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300" htmlFor="firstName">First Name</label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Rahul" required className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300" htmlFor="lastName">Last Name</label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Sharma" required className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="email">Email Address</label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300" htmlFor="password">Password</label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" disabled={isLoading} className="w-full bg-primary text-white hover:bg-primary/90">
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              <div className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
