"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } else {
      setSuccess(true);
    }

    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold mb-2">이메일을 확인해주세요!</h2>
          <p className="text-gray-400 text-sm mb-6">
            {email}로 인증 이메일을 보냈습니다.
            <br />
            이메일의 링크를 클릭해 가입을 완료하세요.
          </p>
          <Link
            href="/auth/login"
            className="text-gundam-red hover:underline text-sm"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gundam-red rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            G
          </div>
          <h1 className="text-2xl font-bold">건담 챗봇 회원가입</h1>
          <p className="text-gray-400 text-sm mt-1">무료로 시작하세요</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
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
              placeholder="8자 이상 입력하세요"
              required
              minLength={8}
              className="w-full bg-gray-800 border border-gray-700 focus:border-gundam-red/50 focus:outline-none rounded-lg px-4 py-3 text-sm placeholder-gray-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gundam-red hover:bg-red-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href="/auth/login" className="text-gundam-red hover:underline">
            로그인
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
