"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, RotateCcw } from "lucide-react"

export default function AutomataConverter() {
  const [currentStep, setCurrentStep] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const conversionSteps = [
    {
      title: "1단계: 톰슨 구성법 (Regexp → NFA)",
      description: "정규 표현식 (a|b)*abb를 NFA로 변환",
      content: "각 연산자에 대한 NFA 컴포넌트를 재귀적으로 조합합니다.",
    },
    {
      title: "2단계: 부분집합 구성법 (NFA → DFA)",
      description: "ε-closure와 move 연산을 사용하여 DFA 구성",
      content: "NFA 상태들의 집합을 DFA의 단일 상태로 변환합니다.",
    },
    {
      title: "3단계: DFA 최소화",
      description: "구별 불가능한 상태들을 병합하여 최소 DFA 생성",
      content: "상태 동등성 검사를 통해 불필요한 상태를 제거합니다.",
    },
    {
      title: "4단계: 정규 문법 생성",
      description: "최소 DFA를 정규 문법으로 변환",
      content: "각 상태를 비단말 기호로, 전이를 생성 규칙으로 변환합니다.",
    },
  ]

  const nfaToDfaExample = {
    nfaStates: [
      { id: "0", closure: "{0,1,2,4,7,8}", label: "A" },
      { id: "1", closure: "{1,2,3,4,6,7,8,9,10}", label: "B" },
      { id: "2", closure: "{1,2,4,5,6,7,8}", label: "C" },
      { id: "3", closure: "{1,2,4,5,6,7,8,11,12}", label: "D" },
      { id: "4", closure: "{1,2,4,5,6,7,8,13}", label: "E (최종)" },
    ],
    transitions: [
      { from: "A", to: "B", symbol: "a" },
      { from: "A", to: "C", symbol: "b" },
      { from: "B", to: "B", symbol: "a" },
      { from: "B", to: "D", symbol: "b" },
      { from: "C", to: "B", symbol: "a" },
      { from: "C", to: "C", symbol: "b" },
      { from: "D", to: "B", symbol: "a" },
      { from: "D", to: "E", symbol: "b" },
      { from: "E", to: "B", symbol: "a" },
      { from: "E", to: "C", symbol: "b" },
    ],
  }

  const nextStep = () => {
    if (currentStep < conversionSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const reset = () => {
    setCurrentStep(0)
    setShowDetails(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>오토마타 변환 실습</CardTitle>
          <CardDescription>정규 표현식에서 최소 DFA까지의 단계별 변환 과정을 학습합니다</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">변환 개요</TabsTrigger>
              <TabsTrigger value="nfa-dfa">NFA → DFA</TabsTrigger>
              <TabsTrigger value="minimization">DFA 최소화</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">예제: (a|b)*abb</h3>
                <p className="text-sm text-gray-600 mb-4">
                  이 정규 표현식은 "a 또는 b가 0회 이상 반복된 후 abb로 끝나는 문자열"을 나타냅니다.
                </p>

                <div className="space-y-3">
                  {conversionSteps.map((step, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded border-l-4 ${
                        index === currentStep
                          ? "border-blue-500 bg-blue-50"
                          : index < currentStep
                            ? "border-green-500 bg-green-50"
                            : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-sm">{step.title}</h4>
                          <p className="text-xs text-gray-600">{step.description}</p>
                        </div>
                        <Badge
                          variant={index === currentStep ? "default" : index < currentStep ? "secondary" : "outline"}
                        >
                          {index === currentStep ? "진행중" : index < currentStep ? "완료" : "대기"}
                        </Badge>
                      </div>
                      {index === currentStep && showDetails && (
                        <div className="mt-2 p-2 bg-white rounded text-sm">{step.content}</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button onClick={prevStep} disabled={currentStep === 0} variant="outline" size="sm">
                    이전 단계
                  </Button>
                  <Button onClick={nextStep} disabled={currentStep === conversionSteps.length - 1} size="sm">
                    다음 단계
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button onClick={() => setShowDetails(!showDetails)} variant="outline" size="sm">
                    {showDetails ? "세부사항 숨기기" : "세부사항 보기"}
                  </Button>
                  <Button onClick={reset} variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    초기화
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="nfa-dfa" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">부분집합 구성법 (Subset Construction)</CardTitle>
                  <CardDescription>NFA 상태들의 집합을 DFA 상태로 변환하는 과정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">DFA 상태 구성</h4>
                      <div className="grid gap-2">
                        {nfaToDfaExample.nfaStates.map((state, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center">
                              <Badge variant="outline" className="mr-2">
                                {state.label}
                              </Badge>
                              <span className="text-sm">ε-closure = {state.closure}</span>
                            </div>
                            {state.label.includes("최종") && <Badge variant="secondary">Accept State</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">전이 테이블</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">상태</th>
                              <th className="text-left p-2">입력 'a'</th>
                              <th className="text-left p-2">입력 'b'</th>
                            </tr>
                          </thead>
                          <tbody>
                            {["A", "B", "C", "D", "E"].map((state) => {
                              const aTransition = nfaToDfaExample.transitions.find(
                                (t) => t.from === state && t.symbol === "a",
                              )
                              const bTransition = nfaToDfaExample.transitions.find(
                                (t) => t.from === state && t.symbol === "b",
                              )
                              return (
                                <tr key={state} className="border-b">
                                  <td className="p-2 font-medium">{state}</td>
                                  <td className="p-2">{aTransition?.to || "-"}</td>
                                  <td className="p-2">{bTransition?.to || "-"}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="minimization" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">DFA 최소화</CardTitle>
                  <CardDescription>구별 불가능한 상태들을 찾아 병합하는 과정</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">상태 분할 과정</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded border">
                          <div className="font-medium text-sm mb-1">초기 분할</div>
                          <div className="text-sm text-gray-600">
                            비최종 상태: {"{A, B, C, D}"}
                            <br />
                            최종 상태: {"{E}"}
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <div className="font-medium text-sm mb-1">1차 정제</div>
                          <div className="text-sm text-gray-600">
                            입력 'b'에 대해 D는 E로 전이하므로 분리
                            <br />
                            결과: {"{A, B, C}"}, {"{D}"}, {"{E}"}
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded border">
                          <div className="font-medium text-sm mb-1">2차 정제</div>
                          <div className="text-sm text-gray-600">
                            입력 'b'에 대해 B는 D로 전이하므로 분리
                            <br />
                            결과: {"{A, C}"}, {"{B}"}, {"{D}"}, {"{E}"}
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <div className="font-medium text-sm mb-1">최종 결과</div>
                          <div className="text-sm text-green-700">
                            A와 C가 병합 가능 → 최소 DFA 완성
                            <br />
                            최종 상태: {"{A,C}"}, {"{B}"}, {"{D}"}, {"{E}"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">상태 동등성 판단 기준</h4>
                      <p className="text-sm text-gray-700">
                        두 상태 p와 q가 구별 불가능하다는 것은 모든 입력 문자열 w에 대해, δ*(p,w)가 최종 상태인 것과
                        δ*(q,w)가 최종 상태인 것이 동치임을 의미합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
