import { NextAuthOptions, getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import type { Role } from '@prisma/client';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciais',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Palavra-passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        // O papel é lido da BD a cada pedido de sessão (getServerSession/useSession
        // revalida periodicamente), garantindo que uma promoção/despromoção feita
        // por um admin se reflete sem exigir novo login.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true },
        });
        (session.user as { role?: Role }).role = dbUser?.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Obtém o utilizador autenticado na BD (fonte da verdade para o papel), ou lança 401. */
async function requireUser(): Promise<{ id: string; role: Role }> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    throw new UnauthorizedError();
  }
  // A sessão (JWT) pode sobreviver à eliminação do utilizador na BD
  // (ex.: reset de BD, conta apagada); sem esta verificação as rotas
  // que usam userId falham com erro de foreign key em vez de 401.
  // O papel (role) também vem sempre da BD, nunca do token, para que uma
  // despromoção tenha efeito imediato mesmo com uma sessão já emitida.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) {
    throw new UnauthorizedError();
  }
  return user;
}

/** Obtém a sessão no servidor (Route Handlers / Server Components) e devolve o userId, ou lança 401. */
export async function requireUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}

/** Como requireUserId, mas exige que o utilizador tenha o papel ADMIN, ou lança 403. */
export async function requireAdminId(): Promise<string> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') {
    throw new ForbiddenError();
  }
  return user.id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Não autenticado');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Sem permissões de administrador');
    this.name = 'ForbiddenError';
  }
}
