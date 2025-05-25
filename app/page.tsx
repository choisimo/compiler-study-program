import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Code, Cpu, ArrowRight, Target, CheckCircle, GitCompareArrows } from "lucide-react"

export default function HomePage() {
  const parts = [
    {
      id: "lexical",
      title: "Part 1: 어휘 분석 (Lexical Analysis)",
      description: "코드의 최소 단위(토큰) 식별",
      icon: <Code className="h-8 w-8" />,
      topics: [
        "정규 표현식 (Regular Expression)",
        "유한 오토마타 (NFA/DFA)",
        "톰슨 구성법 & 부분집합 구성법",
        "DFA 최소화",
      ],
      color: "bg-blue-50 border-blue-200",
      href: "/lexical",
    },
    {
      id: "parsing",
      title: "Part 2: 구문 분석 (Parsing)",
      description: "토큰의 문법적 구조 분석",
      icon: <BookOpen className="h-8 w-8" />,
      topics: ["LL(1) 파싱 (Top-down)", "LR 계열 파싱 (Bottom-up)", "FIRST/FOLLOW 집합", "파싱 테이블 구축"],
      color: "bg-green-50 border-green-200",
      href: "/parsing",
    },
    {
      id: "memory",
      title: "Part 3: 메모리 관리 (Memory Management)",
      description: "자원의 효율적 사용",
      icon: <Cpu className="h-8 w-8" />,
      topics: ["가비지 컬렉션 (GC) 원리", "Mark-and-Sweep 알고리즘", "세대별 GC", "메모리 비효율 코드 분석"],
      color: "bg-purple-50 border-purple-200",
      href: "/memory",
    },
    {
      id: "nfa-to-dfa",
      title: "NFA to DFA 변환기",
      description: "NFA를 DFA로 변환하는 과정을 시각화합니다.",
      icon: <GitCompareArrows className="h-8 w-8" />,
      topics: [
        "부분집합 구성법 (Subset Construction)",
        "ε-클로저 (Epsilon Closure)",
        "상태 전이 테이블 (State Transition Table)",
      ],
      color: "bg-teal-50 border-teal-200",
      href: "/nfa-to-dfa",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">컴파일러 시험 대비 학습 플랫폼</h1>
          <p className="text-xl text-gray-600 mb-6">
            프로그래밍 언어의 소스 코드가 컴퓨터가 이해하는 저수준 명령어로 변환되는 과정의 핵심 원리를 학습합니다
          </p>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Target className="h-4 w-4 mr-2" />
            체계적 학습 · 실습 중심 · 완전 숙달
          </Badge>
        </div>

        {/* Learning Objectives */}
        <Card className="mb-12 border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <Target className="h-6 w-6 mr-2" />
              최상위 학습 목표
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 text-lg leading-relaxed">
              프로그래밍 언어의 소스 코드가 컴퓨터가 이해하는 저수준의 명령어로 변환되는 과정의 핵심 원리를 이해하고,
              주어진 문제에 대해 각 변환 단계를 수동으로 수행할 수 있는 능력을 갖춘다.
            </p>
          </CardContent>
        </Card>

        {/* Parts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
          {parts.map((part, index) => (
            <Card
              key={part.id}
              className={`${part.color} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
            >
              <CardHeader>
                <div className="flex items-center justify-between mb-4">
                  {part.icon}
                  <Badge variant="secondary">Part {index + 1}</Badge>
                </div>
                <CardTitle className="text-xl mb-2">{part.title}</CardTitle>
                <CardDescription className="text-base font-medium">{part.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {part.topics.map((topic, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      {topic}
                    </li>
                  ))}
                </ul>
                <Link href={part.href}>
                  <Button className="w-full group">
                    학습 시작
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: "시각적 학습",
              description: "복잡한 알고리즘을 그래프와 애니메이션으로 설명",
              icon: "📊",
            },
            {
              title: "실습 중심",
              description: "이론과 실습을 결합하여 완전한 이해 도모",
              icon: "💻",
            },
            {
              title: "단계별 접근",
              description: "기초부터 고급까지 체계적인 학습",
              icon: "📈",
            },
            {
              title: "자가 평가",
              description: "문제 해결을 통한 실력 평가",
              icon: "✅",
            },
          ].map((feature, index) => (
            <Card key={index} className="text-center p-6">
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
