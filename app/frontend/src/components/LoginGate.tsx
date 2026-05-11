import { useState, useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function LoginScreen({ onLogin }: { onLogin: (key: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/holdings/portfolios`, {
        headers: { 'X-API-Key': password },
      });

      if (res.ok) {
        localStorage.setItem('app_api_key', password);
        onLogin(password);
      } else if (res.status === 401) {
        setError('Invalid access code');
      } else {
        setError('Cannot verify access');
      }
    } catch {
      setError('Cannot reach server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Portfolio Dashboard</h1>
          <p className="text-sm text-muted-foreground">Private beta — enter your access code</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Access code"
            className="w-full px-3 py-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? 'Checking...' : 'Enter'}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Educational tool only. Not financial advice.
        </p>
      </div>
    </div>
  );
}

export function LoginGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const key = localStorage.getItem('app_api_key');
    if (!key) {
      setAuthenticated(false);
      return;
    }
    fetch(`${API_BASE_URL}/holdings/portfolios`, { headers: { 'X-API-Key': key } })
      .then((res) => {
        if (res.ok) {
          setAuthenticated(true);
        } else {
          localStorage.removeItem('app_api_key');
          setAuthenticated(false);
        }
      })
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return <>{children}</>;
}
