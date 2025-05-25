"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Eye, EyeOff, Lightbulb } from "lucide-react"
import Link from "next/link"
import GarbageCollectionVisualizer from "@/components/gc-visualizer"
import PracticeProblems from "@/components/practice-problems"

export default function MemoryPage() {
  const [showSolution, setShowSolution] = useState<{ [key: string]: boolean }>({})

  const toggleSolution = (problemId: string) => {
    setShowSolution((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-100">
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Part 3: 메모리 관리 (Memory Management) 🧠</h1>
            <p className="text-lg text-gray-600">자원의 효율적 사용 - 가비지 컬렉션의 원리와 메모리 효율성 분석</p>
          </div>
        </div>

        <Tabs defaultValue="theory" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="theory">이론 학습</TabsTrigger>
            <TabsTrigger value="gc-sim">GC 시뮬레이터</TabsTrigger>
            <TabsTrigger value="code-analysis">코드 분석</TabsTrigger>
            <TabsTrigger value="practice">문제 연습</TabsTrigger>
          </TabsList>

          {/* Theory Tab */}
          <TabsContent value="theory" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 가비지 컬렉션 원리 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">1</Badge>
                    가비지 컬렉션 (GC) 원리
                  </CardTitle>
                  <CardDescription>도달 불가능한 객체를 자동으로 식별하고 회수하는 메커니즘</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">핵심 개념</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>가비지:</strong> 도달 불가능한 힙 객체
                      </li>
                      <li>
                        <strong>루트 셋:</strong> 전역 변수, 스택 변수, 레지스터
                      </li>
                      <li>
                        <strong>도달 가능성:</strong> 루트에서 참조 체인으로 접근 가능
                      </li>
                      <li>
                        <strong>Mark-and-Sweep:</strong> 표시 후 수거
                      </li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">GC 과정</h4>
                    <ol className="space-y-1 text-sm list-decimal list-inside">
                      <li>루트 셋에서 시작하여 도달 가능한 객체 표시</li>
                      <li>표시되지 않은 객체를 가비지로 식별</li>
                      <li>가비지 객체의 메모리 회수</li>
                      <li>자유 목록에 추가하여 재사용</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>

              {/* 세대별 GC */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Badge className="mr-2">2</Badge>
                    세대별 가비지 컬렉션
                  </CardTitle>
                  <CardDescription>객체의 생존 기간에 따른 최적화된 메모리 관리</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">세대 가설</h4>
                    <ul className="space-y-1 text-sm">
                      <li>
                        <strong>젊은 객체:</strong> 대부분 빠르게 소멸
                      </li>
                      <li>
                        <strong>오래된 객체:</strong> 더 오래 생존하는 경향
                      </li>
                      <li>
                        <strong>Young Generation:</strong> 자주 수집 (Minor GC)
                      </li>
                      <li>
                        <strong>Old Generation:</strong> 덜 자주 수집 (Major GC)
                      </li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Remembered List</h4>
                    <p className="text-sm text-gray-700">
                      Old 세대에서 Young 세대로의 포인터를 추적하여 Minor GC 시 전체 Old 세대를 스캔하지 않도록 최적화
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 메모리 관리 비교 */}
            <Card>
              <CardHeader>
                <CardTitle>수동 vs 자동 메모리 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">특징</th>
                        <th className="text-left p-3">수동 관리 (C/C++)</th>
                        <th className="text-left p-3">자동 관리 (Java/Python)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3 font-medium">메모리 해제</td>
                        <td className="p-3">프로그래머가 명시적으로 해제</td>
                        <td className="p-3">런타임이 자동으로 처리</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">언어 예시</td>
                        <td className="p-3">C, C++, Rust</td>
                        <td className="p-3">Java, Python, JavaScript</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">장점</td>
                        <td className="p-3">효율적, 높은 제어력</td>
                        <td className="p-3">안전한 코드, 빠른 개발</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">단점</td>
                        <td className="p-3">메모리 누수, 복잡한 코드</td>
                        <td className="p-3">GC 오버헤드, 제어력 부족</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Stop-the-World 설명 */}
            <Card>
              <CardHeader>
                <CardTitle>Stop-the-World 현상</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 text-yellow-800">왜 발생하는가?</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    GC가 객체 그래프의 일관된 뷰를 갖고, GC가 힙을 읽거나 변경하는 동안 애플리케이션이 힙을 수정하는
                    것을 방지하기 위해 발생합니다.
                  </p>
                  <h4 className="font-semibold mb-2 text-yellow-800">영향</h4>
                  <p className="text-sm text-yellow-700">
                    애플리케이션 실행이 일시 중지되어 응답성에 영향을 미칩니다. STW 지속 시간을 최소화하는 것이 GC
                    튜닝의 주요 목표입니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GC Simulator Tab */}
          <TabsContent value="gc-sim">
            <GarbageCollectionVisualizer />
          </TabsContent>

          {/* Code Analysis Tab */}
          <TabsContent value="code-analysis">
            <Card>
              <CardHeader>
                <CardTitle>메모리 효율성 코드 분석</CardTitle>
                <CardDescription>두 코드의 메모리 사용 패턴을 비교하고 분석합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Code 1 */}
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-800">Code 1 (더 효율적)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-4 rounded text-sm overflow-x-auto">
                        {`public class Example {
  public static void test(int arg) {
    if (arg > 100) {
      // temporal data
      int[] temp = new int[1000];
      // 사용 후 범위를 벗어남
    }
    // long-running operation
  }
}`}
                      </pre>
                      <div className="mt-4 space-y-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          변수 범위: if 블록 내부
                        </Badge>
                        <p className="text-sm text-green-700">
                          temp 배열이 if 블록을 벗어나면 즉시 도달 불가능해져 GC 대상이 됩니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Code 2 */}
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-800">Code 2 (덜 효율적)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-white p-4 rounded text-sm overflow-x-auto">
                        {`public class Example {
  public static void test(int arg) {
    int[] temp = null;
    if (arg > 100) {
      // temporal data
      temp = new int[1000];
    }
    // long-running operation     
  }
}`}
                      </pre>
                      <div className="mt-4 space-y-2">
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          변수 범위: test 메소드 전체
                        </Badge>
                        <p className="text-sm text-red-700">
                          temp 변수가 메소드 끝까지 살아있어 배열이 "long-running operation" 동안 계속 참조됩니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 분석 결과 */}
                <Card>
                  <CardHeader>
                    <CardTitle>메모리 효율성 분석</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3">특징</th>
                            <th className="text-left p-3">Code 1</th>
                            <th className="text-left p-3">Code 2</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3 font-medium">변수 범위 (temp)</td>
                            <td className="p-3 text-green-700">if 블록 내부</td>
                            <td className="p-3 text-red-700">test 메소드 전체</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 font-medium">배열 객체 수명</td>
                            <td className="p-3 text-green-700">if 블록 실행 동안</td>
                            <td className="p-3 text-red-700">조건 만족 시 메소드 전체 실행 동안</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 font-medium">GC 대상 가능 시점</td>
                            <td className="p-3 text-green-700">if 블록 종료 직후</td>
                            <td className="p-3 text-red-700">test 메소드 종료 시</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-3 font-medium">long-running operation 동안</td>
                            <td className="p-3 text-green-700">높은 메모리 효율성</td>
                            <td className="p-3 text-red-700">낮은 메모리 효율성</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2 text-blue-800">핵심 원리</h4>
                      <p className="text-sm text-blue-700">
                        GC 환경에서도 변수의 범위를 제한하고 불필요한 참조를 빨리 해제하는 것이 메모리 효율성을 높이는
                        핵심입니다. 객체가 더 빨리 도달 불가능해질수록 GC가 더 효율적으로 작동할 수 있습니다.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Practice Tab */}
          <TabsContent value="practice">
            <PracticeProblems section="memory" />
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
                question: "Root Set에서 시작하여 도달할 수 없는 객체를 모두 정확히 찾아냈는가?",
                answer:
                  "Mark-and-Sweep GC는 루트 셋(전역 변수, 스택 변수, 레지스터 등)에서 시작하여 참조 체인을 따라 도달 가능한 모든 객체를 표시합니다. 표시되지 않은 객체들이 가비지로 식별되어 회수됩니다. 완전한 루트 셋 식별과 정확한 순회가 중요합니다.",
              },
              {
                id: "q2",
                question: "순환 참조(Circular Reference)가 있을 때, 이 객체들이 가비지인지 아닌지 판단할 수 있는가?",
                answer:
                  "Mark-and-Sweep과 같은 추적 GC는 순환 참조 문제를 해결할 수 있습니다. 루트에서 도달 불가능한 순환 참조 객체 그룹은 전체가 표시되지 않아 가비지로 수거됩니다. 이는 단순 참조 카운팅 GC와 달리 순환 참조를 올바르게 처리할 수 있는 장점입니다.",
              },
              {
                id: "q3",
                question: "이 코드가 왜 메모리를 비효율적으로 사용하는가? 어떻게 개선할 수 있는가?",
                answer:
                  "변수 범위가 필요 이상으로 넓거나, 객체 참조를 불필요하게 오래 유지하면 메모리 비효율이 발생합니다. 개선 방법: 1) 변수 범위를 최소화, 2) 사용 후 즉시 참조 해제, 3) 불필요한 객체 생성 방지, 4) 적절한 자료구조 선택 등이 있습니다.",
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
