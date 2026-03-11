import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';
import { Loader2, Mail, Lock } from 'lucide-react';
import loginLogo from '@/assets/login-logo.png';
import fundoLogin from '@/assets/fundo-login.png';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast.error('Erro ao fazer login', { description: error.message });
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-end relative overflow-hidden px-8 md:px-16">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${fundoLogin})` }}
      />

      {/* Subtle overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white/40" />

      {/* Floating login card - light theme to match background */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl px-8 py-10"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(245,245,245,0.96) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        }}
      >
        {/* Red accent top bar */}
        <div className="absolute top-0 left-4 right-4 h-1 rounded-b-full" style={{ background: 'linear-gradient(90deg, #dc2626, #b91c1c, #991b1b)' }} />

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-24 h-24 rounded-2xl p-3 mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.05), rgba(0,0,0,0.02))', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <img src={loginLogo} alt="Concrefuji" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: '#1a1a1a' }}>ERP Integrado</h1>
          <p className="text-xs mt-1" style={{ color: '#737373' }}>Sistema de Gestão Empresarial</p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent)' }} />
          <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#dc2626' }}>Acesso</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
              <Input
                id="login-email"
                type="email"
                placeholder="seu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="pl-10 h-10 border text-sm"
                style={{ background: 'rgba(0,0,0,0.03)', color: '#1a1a1a', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)' }}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#525252' }}>Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#a3a3a3' }} />
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="pl-10 h-10 border text-sm"
                style={{ background: 'rgba(0,0,0,0.03)', color: '#1a1a1a', borderRadius: '8px', borderColor: 'rgba(0,0,0,0.1)' }}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-10 font-semibold text-sm border-0 mt-1"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
              color: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 4px 15px rgba(220,38,38,0.3)',
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: '#a3a3a3' }}>© 2026 Concrefuji · Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
