"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Eye, EyeOff, Lightbulb } from "lucide-react"
import Link from "next/link"
import RegexVisualizer from "@/components/regex-visualizer"
import AutomataConverter from "@/components/automata-converter"
import PracticeProblems from "@/components/practice-problems"

export default function LexicalPage() {
  const [showSolution, setShowSolution] = useState<{ [key: string]: boolean }>({})

  const toggleSolution = (problemId: string) => {
    setShowSolution((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              돌아가기
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Part 1: 어휘 분석 (Lexical Analysis) 🌍</h1>
            <p className="text-lg text-gray-600">
              코드의 최소 단위(토큰) 식별 - 정규 표현식과 유한 오토마타의 관계 완벽 이해
            </p>
          </div>
        </div>

        <Tabs defaultValue="theory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theory">이론 학습</TabsTrigger>
            <TabsTrigger value="visualizer">시각화 도구</TabsTrigger>
            <TabsTrigger value="converter">변환 실습</TabsTrigger>
            <TabsTrigger value="practice">문제 연습</TabsTrigger>
          </TabsList>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 정규 표현식 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">1</Badge>
                    정규 표현식 (Regular Expression)
                  </CardTitle>
                  <CardDescription>문자열 패턴을 정규 표현식으로 작성하고 해석하는 방법</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">핵심 연산자</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <code className="bg-white px-1 rounded">ab</code> - 연결 (Concatenation)
                      </li>
                      <li>
                        <code className="bg-white px-1 rounded">a|b</code> - 선택 (Or)
                      </li>
                      <li>
                        <code className="bg-white px-1 rounded">a*</code> - 클레이니 스타 (0회 이상)
                      </li>
                      <li>
                        <code className="bg-white px-1 rounded">a+</code> - 클레이니 플러스 (1회 이상)
                      </li>
                      <li>
                        <code className="bg-white px-1 rounded">[a-z]</code> - 문자 클래스
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">예제</h4>
                    <p className="text-sm mb-2">식별자 패턴:</p>
                    <code className="bg-white px-2 py-1 rounded block">letter(letter|digit)*</code>
                    <p className="text-xs text-gray-600 mt-1">letter = [a-zA-Z], digit = [0-9]</p>
                  </div>
                </CardContent>
              </Card>

              {/* NFA/DFA 변환 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">2</Badge>
                    정규 표현식 → 유한 오토마타 변환
                  </CardTitle>
                  <CardDescription>톰슨 구성법과 부분집합 구성법을 통한 체계적 변환</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">변환 단계</h4>
                    <ol className="space-y-1 text-sm list-decimal list-inside">
                      <li>정규 표현식 → NFA (톰슨 구성법)</li>
                      <li>NFA → DFA (부분집합 구성법)</li>
                      <li>DFA → 최소 DFA (상태 병합)</li>
                      <li>최소 DFA → 정규 문법</li>
                    </ol>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">핵심 개념</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>ε-closure:</strong> ε 전이로 도달 가능한 상태들
                      </li>
                      <li>
                        <strong>상태 동등성:</strong> 구별 불가능한 상태들
                      </li>
                      <li>
                        <strong>최소화:</strong> 동등한 상태들의 병합
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 학습 절차 */}
            <Card>
              <CardHeader>
                <CardTitle>체계적 학습 절차</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 text-blue-700">1단계: 정규 표현식 마스터</h4>
                    <ol className="space-y-2 text-sm list-decimal list-inside">
                      <li>언어 규칙 분석 (예: 'a로 시작하고 b로 끝나는 문자열')</li>
                      <li>기본 연산자 조합하여 규칙 표현</li>
                      <li>간단한 식별자부터 복잡한 패턴으로 확장</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 text-green-700">2단계: 오토마타 변환</h4>
                    <ol className="space-y-2 text-sm list-decimal list-inside">
                      <li>톰슨 구성법으로 NFA 구축</li>
                      <li>ε-closure 정확히 계산</li>
                      <li>부분집합 구성법으로 DFA 변환</li>
                      <li>상태 최소화 및 문법 변환</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visualizer Tab */}
          <TabsContent value="visualizer">
            <RegexVisualizer />
          </TabsContent>

          {/* Converter Tab */}
          <TabsContent value="converter">
            <AutomataConverter />
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice">
            <PracticeProblems section="lexical" />
          </TabsContent>
        </Tabs>

        {/* 최종 점검 질문 */}
        <Card className="mt-8 border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-800">
              <Lightbulb className="h-6 w-6 mr-2" />
              최종 점검 질문
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              {
                id: "q1",
                question: "NFA에서 DFA로 변환 시 모든 가능한 상태 집합을 고려했는가?",
                answer:
                  "부분집합 구성법에서는 NFA 상태들의 모든 가능한 조합을 DFA 상태로 만들어야 합니다. ε-closure를 정확히 계산하고, 각 입력 기호에 대해 move 연산을 수행한 후 다시 ε-closure를 적용하는 과정을 반복해야 합니다.",
              },
              {
                id: "q2",
                question: "Minimal DFA가 정말로 최소 상태의 개수를 가지는가?",
                answer:
                  "상태 동등성 검사를 통해 구별 불가능한 상태들을 찾아 병합합니다. 두 상태가 모든 입력 문자열에 대해 동일한 수락/거부 결과를 보이면 동등하며, 이러한 상태들을 병합하여 최소 DFA를 얻습니다.",
              },
              {
                id: "q3",
                question: "내가 만든 정규 문법이 원래 정규 표현식과 동일한 언어를 생성하는가?",
                answer:
                  "DFA의 각 상태를 비단말 기호로, 각 전이를 생성 규칙으로 변환합니다. 최종 상태에는 ε 생성 규칙을 추가합니다. 이렇게 만든 정규 문법은 원래 정규 표현식과 동일한 언어를 생성합니다.",
              },
            ].map((item) => (
              <div key={item.id} className="border border-amber-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-amber-800">{item.question}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSolution(item.id)}
                    className="text-amber-700 border-amber-300"
                  >
                    {showSolution[item.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showSolution[item.id] ? "해설 숨기기" : "해설 보기"}
                  </Button>
                </div>
                {showSolution[item.id] && (
                  <div className="bg-white p-3 rounded border border-amber-200">
                    <p className="text-sm text-gray-700">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
