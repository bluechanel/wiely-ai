'use client';

import ProtectedRoute from '@/components/auth/protected-route';
import Button from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-6">个人资料</h1>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <span className="w-32 text-gray-600">邮箱:</span>
                <span className="font-medium">{session?.user?.email}</span>
              </div>
              
              <div className="flex items-center">
                <span className="w-32 text-gray-600">用户名:</span>
                <span className="font-medium">{session?.user?.name || '未设置'}</span>
              </div>
              
              <div className="pt-4">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                >
                  返回首页
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}