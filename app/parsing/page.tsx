"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Eye, EyeOff, Lightbulb } from "lucide-react"
import Link from "next/link"
import ParsingVisualizer from "@/components/parsing-visualizer"
import PracticeProblems from "@/components/practice-problems"

export default function ParsingPage() {
  const [showSolution, setShowSolution] = useState<{ [key: string]: boolean }>({})

  const toggleSolution = (problemId: string) => {
    setShowSolution((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-100">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Part 2: 구문 분석 (Parsing) 🏗️</h1>
            <p className="text-lg text-gray-600">토큰의 문법적 구조 분석 - 상향식 및 하향식 파싱의 원리 이해</p>
          </div>
        </div>

        <Tabs defaultValue="theory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theory">이론 학습</TabsTrigger>
            <TabsTrigger value="ll1">LL(1) 파싱</TabsTrigger>
            <TabsTrigger value="lr">LR 파싱</TabsTrigger>
            <TabsTrigger value="practice">문제 연습</TabsTrigger>
          </TabsList>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LL(1) 파싱 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">1</Badge>
                    LL(1) 파싱 (Top-down)
                  </CardTitle>
                  <CardDescription>좌에서 우로 스캔, 최좌단 유도, 1 토큰 선행 탐색</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">핵심 개념</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>FIRST 집합:</strong> 비단말에서 유도되는 첫 번째 단말들
                      </li>
                      <li>
                        <strong>FOLLOW 집합:</strong> 비단말 다음에 올 수 있는 단말들
                      </li>
                      <li>
                        <strong>예측 파싱:</strong> 선행 탐색으로 규칙 선택
                      </li>
                      <li>
                        <strong>좌측 재귀 제거:</strong> 무한 루프 방지
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">파싱 테이블 구축</h4>
                    <ol className="space-y-1 text-sm list-decimal list-inside">
                      <li>FIRST와 FOLLOW 집합 계산</li>
                      <li>각 생성 규칙에 대해 테이블 항목 추가</li>
                      <li>충돌 검사 및 해결</li>
                      <li>파싱 알고리즘 실행</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* LR 파싱 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">2</Badge>
                    LR 계열 파싱 (Bottom-up)
                  </CardTitle>
                  <CardDescription>LR(0), SLR(1), LR(1), LALR(1) 파서의 특징과 차이점</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">LR 파서 계열</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>LR(0):</strong> 선행 탐색 없음, 충돌 발생 가능
                      </li>
                      <li>
                        <strong>SLR(1):</strong> FOLLOW 집합으로 충돌 해결
                      </li>
                      <li>
                        <strong>LR(1):</strong> 가장 강력, 상태 수 많음
                      </li>
                      <li>
                        <strong>LALR(1):</strong> LR(1) 상태 병합, 실용적
                      </li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">핵심 동작</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>Shift:</strong> 입력 토큰을 스택에 이동
                      </li>
                      <li>
                        <strong>Reduce:</strong> 핸들을 LHS로 축소
                      </li>
                      <li>
                        <strong>Accept:</strong> 시작 기호로 축소 완료
                      </li>
                      <li>
                        <strong>Error:</strong> 구문 오류 발생
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 비교 테이블 */}
            <Card>
              <CardHeader>
                <CardTitle>LL(1) vs LR 파싱 비교</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">특징</th>
                        <th className="text-left p-3">LL(1)</th>
                        <th className="text-left p-3">LR 계열</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3 font-medium">파싱 방향</td>
                        <td className="p-3">하향식 (Top-down)</td>
                        <td className="p-3">상향식 (Bottom-up)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">유도 방식</td>
                        <td className="p-3">최좌단 유도</td>
                        <td className="p-3">최우단 유도 (역순)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">문법 범위</td>
                        <td className="p-3">제한적</td>
                        <td className="p-3">더 넓은 범위</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">좌측 재귀</td>
                        <td className="p-3">처리 불가 (변환 필요)</td>
                        <td className="p-3">자연스럽게 처리</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">구현 복잡도</td>
                        <td className="p-3">상대적으로 간단</td>
                        <td className="p-3">복잡하지만 강력</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LL(1) Tab */}
          <TabsContent value="ll1">
            <ParsingVisualizer type="ll1" />
          </TabsContent>

          {/* LR Tab */}
          <TabsContent value="lr">
            <ParsingVisualizer type="lr" />
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice">
            <PracticeProblems section="parsing" />
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
                question: "FIRST와 FOLLOW 집합을 올바르게 계산했는가?",
                answer:
                  "FIRST(A)는 A에서 유도될 수 있는 문자열의 첫 번째 단말 기호들의 집합입니다. FOLLOW(A)는 어떤 문장 유도에서 A 바로 다음에 올 수 있는 단말 기호들의 집합입니다. 계산 시 ε 생성 규칙과 재귀적 의존성을 정확히 고려해야 합니다.",
              },
              {
                id: "q2",
                question: "파싱 테이블에 충돌(Conflict)이 발생하는가? 그렇다면 왜 발생하는가?",
                answer:
                  "충돌은 파싱 테이블의 한 셀에 둘 이상의 동작이 정의될 때 발생합니다. LL(1)에서는 FIRST 집합의 교집합이나 FIRST와 FOLLOW의 교집합이 있을 때, LR에서는 Shift-Reduce 또는 Reduce-Reduce 충돌이 발생할 수 있습니다. 이는 문법이 해당 파싱 방법에 적합하지 않음을 의미합니다.",
              },
              {
                id: "q3",
                question: "파싱 과정에서 스택의 변화를 정확히 추적할 수 있는가?",
                answer:
                  "LL(1)에서는 스택에 비단말과 단말이 혼재하며, 비단말을 만나면 생성 규칙의 RHS로 대체합니다. LR에서는 상태와 기호가 번갈아 나타나며, Shift 시 기호와 상태를 push하고, Reduce 시 규칙의 길이만큼 pop한 후 새로운 상태를 push합니다.",
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
