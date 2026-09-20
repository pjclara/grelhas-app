'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const resultado = await signIn('credentials', { email, password, redirect: false });
    setCarregando(false);
    if (resultado?.error) {
      setErro('Email ou palavra-passe incorretos.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Grelhas de Avaliação</h1>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <p className="mb-6 text-sm text-slate-500">Entre com a sua conta de professor.</p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Palavra-passe</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {erro && <Alert tone="danger">{erro}</Alert>}
            <Button type="submit" loading={carregando} className="w-full">
              {carregando ? 'A entrar…' : 'Entrar'}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Ainda não tem conta?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
