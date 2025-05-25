"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Eye, EyeOff, Lightbulb } from "lucide-react"

interface PracticeProblemsProps {
  section: "lexical" | "parsing" | "memory"
}

export default function PracticeProblems({ section }: PracticeProblemsProps) {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({})
  const [showSolutions, setShowSolutions] = useState<{ [key: string]: boolean }>({})
  const [submitted, setSubmitted] = useState<{ [key: string]: boolean }>({})

  const problems = {
    lexical: [
      {
        id: "lex1",
        title: "정규 표현식 작성",
        question: "다음 언어를 나타내는 정규 표현식을 작성하세요: '0으로 시작하고 1로 끝나는 이진 문자열'",
        type: "text",
        correctAnswer: "0(0|1)*1",
        solution:
          "0으로 시작하므로 '0', 중간에 0 또는 1이 0회 이상 반복되므로 '(0|1)*', 1로 끝나므로 '1'. 따라서 답은 '0(0|1)*1'입니다.",
        difficulty: "기초",
      },
      {
        id: "lex2",
        title: "NFA → DFA 변환",
        question: "주어진 NFA에서 상태 {q0, q1, q2}의 ε-closure를 구하세요. (ε-전이: q0→q1, q1→q2)",
        type: "text",
        correctAnswer: "{q0, q1, q2}",
        solution:
          "ε-closure는 ε-전이만으로 도달 가능한 모든 상태를 포함합니다. q0에서 시작하여 ε-전이로 q1에 도달하고, q1에서 ε-전이로 q2에 도달할 수 있으므로 ε-closure({q0, q1, q2}) = {q0, q1, q2}입니다.",
        difficulty: "중급",
      },
      {
        id: "lex3",
        title: "DFA 최소화",
        question: "두 상태가 '구별 불가능하다'는 것의 정의를 설명하세요.",
        type: "textarea",
        correctAnswer: "모든 입력 문자열에 대해 동일한 수락/거부 결과를 보이는 상태들",
        solution:
          "두 상태 p와 q가 구별 불가능하다는 것은 모든 입력 문자열 w에 대해, δ*(p,w)가 최종 상태인 것과 δ*(q,w)가 최종 상태인 것이 동치임을 의미합니다. 즉, 언어 수용과 관련하여 동일하게 행동하는 상태들입니다.",
        difficulty: "중급",
      },
    ],
    parsing: [
      {
        id: "parse1",
        title: "FIRST 집합 계산",
        question: "문법 규칙 A → aB | ε, B → bC | c에서 FIRST(A)를 구하세요.",
        type: "text",
        correctAnswer: "{a, ε}",
        solution: "A → aB에서 FIRST(aB) = {a}, A → ε에서 FIRST(ε) = {ε}이므로 FIRST(A) = {a, ε}입니다.",
        difficulty: "기초",
      },
      {
        id: "parse2",
        title: "LL(1) 파싱 테이블",
        question: "LL(1) 파싱에서 좌측 재귀가 문제가 되는 이유를 설명하세요.",
        type: "textarea",
        correctAnswer: "무한 재귀를 유발하여 파서가 입력을 소비하지 않고 같은 규칙을 반복 적용",
        solution:
          "좌측 재귀(A → Aα)는 하향식 파서에서 무한 재귀를 유발합니다. 파서가 입력을 소비하지 않고 동일한 좌측 재귀 규칙을 반복적으로 적용하려고 시도하기 때문입니다. 이를 해결하려면 A → Aα | β를 A → βA', A' → αA' | ε로 변환해야 합니다.",
        difficulty: "중급",
      },
      {
        id: "parse3",
        title: "SLR(1) vs LR(1)",
        question: "SLR(1)에서 FOLLOW 집합의 역할을 설명하세요.",
        type: "textarea",
        correctAnswer: "축소 동작을 언제 수행할지 결정하는 데 사용",
        solution:
          "SLR(1)에서 FOLLOW 집합은 축소 동작을 언제 수행할지 결정하는 데 사용됩니다. 항목 A → α.에 대해, 이 규칙에 의한 축소는 FOLLOW(A)의 모든 단말 t에 대해 ACTION[state, t]에 배치됩니다. 이는 LR(0) 충돌을 해결하는 데 도움이 됩니다.",
        difficulty: "고급",
      },
    ],
    memory: [
      {
        id: "mem1",
        title: "가비지 식별",
        question: "루트 셋에서 도달 불가능한 객체가 가비지인 이유를 설명하세요.",
        type: "textarea",
        correctAnswer: "프로그램에서 더 이상 접근할 수 없으므로 사용될 수 없음",
        solution:
          "루트 셋에서 도달 불가능한 객체는 실행 중인 프로그램의 어떤 부분에서도 더 이상 접근할 수 없습니다. 따라서 이러한 객체들은 다시 사용될 수 없으므로 가비지로 간주되어 메모리를 회수할 수 있습니다.",
        difficulty: "기초",
      },
      {
        id: "mem2",
        title: "Mark-and-Sweep",
        question: "Mark-and-Sweep GC에서 'Stop-the-World' 현상이 발생하는 이유를 설명하세요.",
        type: "textarea",
        correctAnswer: "객체 그래프의 일관된 뷰를 보장하고 안전한 메모리 회수를 위해",
        solution:
          "Mark-and-Sweep GC에서 'Stop-the-World' 현상은 GC가 객체 그래프의 일관된 뷰를 갖고, GC가 힙을 읽거나 변경하는 동안 애플리케이션이 힙을 수정하는 것을 방지하기 위해 발생합니다. 애플리케이션이 계속 실행되면 GC가 살아있는 객체를 놓치거나 아직 사용 중인 객체를 회수하려고 시도할 수 있습니다.",
        difficulty: "중급",
      },
      {
        id: "mem3",
        title: "순환 참조",
        question:
          "두 객체가 서로를 참조하는 순환 참조가 있을 때, 루트에서 도달 불가능하다면 GC에 의해 수거될 수 있는지 설명하세요.",
        type: "textarea",
        correctAnswer: "예, 루트에서 도달 불가능하다면 순환 참조와 관계없이 수거됨",
        solution:
          "예, 루트 셋에서 도달 불가능하다면 수거될 수 있습니다. Mark-and-Sweep과 같은 추적 GC는 루트에서 시작합니다. 순환 참조된 객체 그룹이 어떤 루트에서도 도달할 수 없다면, 전체 그룹은 표시되지 않고 수거될 것입니다. 이는 단순 참조 카운팅 GC와 달리 순환 참조 문제를 해결할 수 있는 장점입니다.",
        difficulty: "고급",
      },
    ],
  }

  const currentProblems = problems[section] || []

  const handleAnswerChange = (problemId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [problemId]: value,
    }))
  }

  const submitAnswer = (problemId: string) => {
    setSubmitted((prev) => ({
      ...prev,
      [problemId]: true,
    }))
  }

  const toggleSolution = (problemId: string) => {
    setShowSolutions((prev) => ({
      ...prev,
      [problemId]: !prev[problemId],
    }))
  }

  const checkAnswer = (problemId: string, correctAnswer: string) => {
    const userAnswer = answers[problemId]?.toLowerCase().trim() || ""
    const correct = correctAnswer.toLowerCase().trim()
    return userAnswer.includes(correct) || correct.includes(userAnswer)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>실습 문제</CardTitle>
          <CardDescription>각 문제를 해결하고 해설을 확인하여 이해도를 점검하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {currentProblems.map((problem, index) => (
              <Card key={problem.id} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      문제 {index + 1}: {problem.title}
                    </CardTitle>
                    <Badge
                      variant={
                        problem.difficulty === "기초"
                          ? "secondary"
                          : problem.difficulty === "중급"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {problem.difficulty}
                    </Badge>
                  </div>
                  <CardDescription>{problem.question}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {problem.type === "text" ? (
                    <div className="space-y-2">
                      <Label htmlFor={`answer-${problem.id}`}>답안</Label>
                      <Input
                        id={`answer-${problem.id}`}
                        value={answers[problem.id] || ""}
                        onChange={(e) => handleAnswerChange(problem.id, e.target.value)}
                        placeholder="답안을 입력하세요"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor={`answer-${problem.id}`}>답안</Label>
                      <Textarea
                        id={`answer-${problem.id}`}
                        value={answers[problem.id] || ""}
                        onChange={(e) => handleAnswerChange(problem.id, e.target.value)}
                        placeholder="답안을 입력하세요"
                        rows={4}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => submitAnswer(problem.id)} disabled={!answers[problem.id]?.trim()} size="sm">
                      답안 제출
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleSolution(problem.id)}>
                      {showSolutions[problem.id] ? (
                        <EyeOff className="h-4 w-4 mr-1" />
                      ) : (
                        <Eye className="h-4 w-4 mr-1" />
                      )}
                      해설 {showSolutions[problem.id] ? "숨기기" : "보기"}
                    </Button>
                  </div>

                  {submitted[problem.id] && (
                    <div
                      className={`p-3 rounded-lg flex items-center ${
                        checkAnswer(problem.id, problem.correctAnswer)
                          ? "bg-green-50 border border-green-200"
                          : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {checkAnswer(problem.id, problem.correctAnswer) ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className="font-medium">
                        {checkAnswer(problem.id, problem.correctAnswer) ? "정답입니다!" : "다시 시도해보세요."}
                      </span>
                    </div>
                  )}

                  {showSolutions[problem.id] && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Lightbulb className="h-5 w-5 text-amber-600 mr-2" />
                        <span className="font-semibold text-amber-800">해설</span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-sm">정답: </span>
                          <code className="bg-white px-2 py-1 rounded text-sm">{problem.correctAnswer}</code>
                        </div>
                        <p className="text-sm text-amber-700">{problem.solution}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
