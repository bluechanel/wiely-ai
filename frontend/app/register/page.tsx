'use client';

import RegisterForm from '@/components/auth/register-form';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisterPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">创建账号</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            请注册一个新账号
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}