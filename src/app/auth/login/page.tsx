"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } else {
      router.push("/chat");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gundam-red rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            G
          </div>
          <h1 className="text-2xl font-bold">건담 챗봇 로그인</h1>
          <p className="text-gray-400 text-sm mt-1">계정에 로그인하세요</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gundam@example.com"
              required
              className="w-full bg-gray-800 border border-gray-700 focus:border-gundam-red/50 focus:outline-none rounded-lg px-4 py-3 text-sm placeholder-gray-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-gray-800 border border-gray-700 focus:border-gundam-red/50 focus:outline-none rounded-lg px-4 py-3 text-sm placeholder-gray-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gundam-red hover:bg-red-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          계정이 없으신가요?{" "}
          <Link href="/auth/signup" className="text-gundam-red hover:underline">
            회원가입
          </Link>
        </p>
        <p className="text-center mt-2">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← 홈으로
          </Link>
        </p>
      </div>
    </div>
  );
}
