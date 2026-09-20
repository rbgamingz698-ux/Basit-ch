import React from 'react';
import { useAuth } from './AuthProvider';
import { Chrome } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { signIn } = useAuth();

  return (
    <div className="h-screen flex items-center justify-center bg-[#131722] text-[#d1d4dc]">
      <div className="p-8 bg-[#1e222d] rounded-2xl border border-[#2a2e39] max-w-sm w-full shadow-2xl">
        {/* Placeholder for logo icon */}
        <div className="w-12 h-12 bg-[#2962FF] rounded-xl mb-8"></div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-[#787b86] mb-8">Log in to continue to your workspace</p>
        
        {/* Email/Password Fields placeholder - functionally empty as requested */}
        <div className="space-y-4 mb-8">
            <div className="text-xs text-[#787b86]">Email</div>
            <div className="h-10 bg-[#131722] border border-[#2a2e39] rounded-lg"></div>
            <div className="text-xs text-[#787b86]">Password</div>
            <div className="h-10 bg-[#131722] border border-[#2a2e39] rounded-lg"></div>
        </div>
        
        <button className="w-full py-3 bg-white text-[#131722] rounded-lg font-bold mb-6">Log in</button>

        <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#2a2e39]"></div>
            <div className="text-xs text-[#787b86]">or</div>
            <div className="flex-1 h-px bg-[#2a2e39]"></div>
        </div>

        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#131722] border border-[#2a2e39] text-white rounded-lg font-medium hover:bg-[#2a2e39] transition-colors"
        >
          <Chrome className="w-5 h-5" />
          Continue with Google
        </button>
      </div>
    </div>
  );
};
