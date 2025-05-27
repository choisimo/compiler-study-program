"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, RotateCcw, CheckCircle, XCircle } from "lucide-react"

export default function RegexVisualizer() {
  const [regex, setRegex] = useState("(a|b)*abb")
  const [testString, setTestString] = useState("ababb")
  const [isMatching, setIsMatching] = useState<boolean | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const examples = [
    { pattern: "(a|b)*abb", description: "a 또는 b가 0회 이상 반복된 후 abb로 끝나는 문자열" },
    { pattern: "[a-z]+", description: "소문자가 1회 이상 반복되는 문자열" },
    { pattern: "0(0|1)*1", description: "0으로 시작하고 1로 끝나는 이진 문자열" },
    { pattern: "[0-9]+(\\.[0-9]+)?", description: "정수 또는 소수" },
  ]

  const nfaStates = [
    { id: 0, label: "q0", isStart: true, isAccept: false },
    { id: 1, label: "q1", isStart: false, isAccept: false },
    { id: 2, label: "q2", isStart: false, isAccept: false },
    { id: 3, label: "q3", isStart: false, isAccept: false },
    { id: 4, label: "q4", isStart: false, isAccept: true },
  ]

  const transitions = [
    { from: 0, to: 1, label: "a,b" },
    { from: 1, to: 1, label: "a,b" },
    { from: 1, to: 2, label: "a" },
    { from: 2, to: 3, label: "b" },
    { from: 3, to: 4, label: "b" },
  ]

  const simulateRegex = () => {
    // 간단한 시뮬레이션 로직
    const patterns = {
      "(a|b)*abb": /^[ab]*abb$/,
      "[a-z]+": /^[a-z]+$/,
      "0(0|1)*1": /^0[01]*1$/,
      "[0-9]+(\\.[0-9]+)?": /^[0-9]+(\.[0-9]+)?$/,
    }

    const pattern = patterns[regex as keyof typeof patterns] || new RegExp(regex)
    setIsMatching(pattern.test(testString))
    setCurrentStep(1)
  }

  const reset = () => {
    setIsMatching(null)
    setCurrentStep(0)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>정규 표현식 시각화 도구</CardTitle>
          <CardDescription>정규 표현식을 입력하고 NFA/DFA 변환 과정을 시각적으로 확인해보세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 입력 섹션 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regex">정규 표현식</Label>
              <Input
                id="regex"
                value={regex}
                onChange={(e) => setRegex(e.target.value)}
                placeholder="정규 표현식을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testString">테스트 문자열</Label>
              <Input
                id="testString"
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="테스트할 문자열을 입력하세요"
              />
            </div>
          </div>

          {/* 예제 패턴 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">예제 패턴</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {examples.map((example, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="justify-start h-auto p-3"
                  onClick={() => setRegex(example.pattern)}
                >
                  <div className="text-left">
                    <div className="font-mono text-sm">{example.pattern}</div>
                    <div className="text-xs text-gray-500">{example.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* 제어 버튼 */}
          <div className="flex gap-2">
            <Button onClick={simulateRegex} className="flex items-center">
              <Play className="h-4 w-4 mr-2" />
              시뮬레이션 실행
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
          </div>

          {/* 결과 표시 */}
          {isMatching !== null && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                {isMatching ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <span className="font-semibold">{isMatching ? "매칭 성공!" : "매칭 실패"}</span>
              </div>
              <p className="text-sm text-gray-600">
                문자열 "{testString}"이 패턴 "{regex}"와 {isMatching ? "일치합니다" : "일치하지 않습니다"}.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NFA 다이어그램 시각화 */}
      <Card>
        <CardHeader>
          <CardTitle>NFA 상태 다이어그램</CardTitle>
          <CardDescription>정규 표현식 (a|b)*abb에 대한 NFA 구조</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-6 rounded-lg">
            <svg width="100%" height="300" viewBox="0 0 800 300">
              {/* 상태들 */}
              {nfaStates.map((state, index) => (
                <g key={state.id}>
                  <circle
                    cx={100 + index * 150}
                    cy={150}
                    r={30}
                    fill={state.isStart ? "#3b82f6" : state.isAccept ? "#10b981" : "#e5e7eb"}
                    stroke="#374151"
                    strokeWidth="2"
                  />
                  <text
                    x={100 + index * 150}
                    y={155}
                    textAnchor="middle"
                    className="text-sm font-semibold"
                    fill={state.isStart || state.isAccept ? "white" : "black"}
                  >
                    {state.label}
                  </text>
                  {state.isStart && (
                    <polygon
                      points={`${70 + index * 150},150 ${85 + index * 150},145 ${85 + index * 150},155`}
                      fill="#374151"
                    />
                  )}
                  {state.isAccept && (
                    <circle cx={100 + index * 150} cy={150} r={25} fill="none" stroke="white" strokeWidth="2" />
                  )}
                </g>
              ))}

              {/* 전이들 */}
              <g>
                {/* q0 to q1 */}
                <path
                  d="M 130 150 Q 175 120 220 150"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text x="175" y="135" textAnchor="middle" className="text-xs">
                  a,b
                </text>

                {/* q1 self loop */}
                <path
                  d="M 250 120 Q 250 90 250 120"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text x="250" y="85" textAnchor="middle" className="text-xs">
                  a,b
                </text>

                {/* q1 to q2 */}
                <line
                  x1="280"
                  y1="150"
                  x2="370"
                  y2="150"
                  stroke="#374151"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text x="325" y="145" textAnchor="middle" className="text-xs">
                  a
                </text>

                {/* q2 to q3 */}
                <line
                  x1="430"
                  y1="150"
                  x2="520"
                  y2="150"
                  stroke="#374151"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text x="475" y="145" textAnchor="middle" className="text-xs">
                  b
                </text>

                {/* q3 to q4 */}
                <line
                  x1="580"
                  y1="150"
                  x2="670"
                  y2="150"
                  stroke="#374151"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text x="625" y="145" textAnchor="middle" className="text-xs">
                  b
                </text>
              </g>

              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#374151" />
                </marker>
              </defs>
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
              시작 상태
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
              최종 상태
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
              중간 상태
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
