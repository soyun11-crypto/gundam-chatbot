import Link from "next/link";
import { MessageSquare, Zap, BookOpen, Shield } from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "전문 건담 지식",
    description: "UC부터 수성의 마녀까지, 모든 시리즈의 기체·캐릭터·세계관 정보",
  },
  {
    icon: Zap,
    title: "실시간 스트리밍",
    description: "AI가 생각하는 그대로 실시간으로 답변을 받아보세요",
  },
  {
    icon: BookOpen,
    title: "대화 기록 저장",
    description: "이전 대화를 저장하고 언제든지 다시 확인하세요",
  },
  {
    icon: Shield,
    title: "건프라 정보",
    description: "HG, MG, RG, PG 등 건프라 관련 정보도 안내합니다",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gundam-red rounded-full flex items-center justify-center font-bold text-sm">
              G
            </div>
            <span className="font-bold text-lg">건담 챗봇</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/auth/signup"
              className="bg-gundam-red hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              시작하기
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-gundam-red/10 border border-gundam-red/30 text-gundam-red px-3 py-1 rounded-full text-sm mb-6">
            <span className="w-2 h-2 bg-gundam-red rounded-full animate-pulse" />
            건담 전문 AI 어시스턴트
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            건담의 모든 것을
            <br />
            <span className="text-gundam-red">AI에게 물어보세요</span>
          </h1>
          <p className="text-gray-400 text-lg mb-10 leading-relaxed">
            기동전사 건담부터 수성의 마녀까지, 기체 스펙·파일럿·세계관까지
            <br />
            건담 전문 AI가 한국어로 친절하게 답변드립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/chat"
              className="bg-gundam-red hover:bg-red-700 text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
            >
              채팅 시작하기
            </Link>
            <Link
              href="/auth/signup"
              className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-3 rounded-lg font-medium transition-colors text-lg"
            >
              무료로 가입하기
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 border-t border-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-gray-600 transition-colors"
              >
                <feature.icon className="w-8 h-8 text-gundam-red mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-gray-500 text-sm">
        <p>건담 챗봇 &copy; 2024 · 건담 시리즈는 Bandai Namco의 저작물입니다.</p>
      </footer>
    </main>
  );
}
