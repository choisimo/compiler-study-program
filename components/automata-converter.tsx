"use client"

// import { useState } from "react" // No longer needed for currentStep, showDetails
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button" // No longer needed for overview step buttons
// import { Badge } from "@/components/ui/badge" // No longer needed for overview step status
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { ArrowRight, RotateCcw } from "lucide-react" // No longer needed for overview step buttons

// Import the visualizer components
import RegexToNfaVisualizer from "./regex-to-nfa-visualizer"
import NfaToDfaVisualizer from "./nfa-to-dfa-visualizer"
import DfaMinimizationVisualizer from "./dfa-minimization-visualizer"


export default function AutomataConverter() {
  // Removed state: currentStep, showDetails
  // Removed data: conversionSteps, nfaToDfaExample
  // Removed functions: nextStep, prevStep, reset

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>오토마타 변환 실습</CardTitle>
          <CardDescription>정규 표현식에서 최소 DFA까지의 단계별 변환 과정을 학습하고 각 단계를 시각적으로 실행해봅니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4"> {/* Updated to 4 columns */}
              <TabsTrigger value="overview">변환 개요</TabsTrigger>
              <TabsTrigger value="regex-nfa">Regex → NFA</TabsTrigger>
              <TabsTrigger value="nfa-dfa">NFA → DFA</TabsTrigger>
              <TabsTrigger value="minimization">DFA 최소화</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <h3 className="text-xl font-semibold mb-3 text-blue-700 dark:text-blue-300">오토마타 변환 과정 안내</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  이 페이지에서는 정규 표현식(Regular Expression)으로부터 NFA(Non-deterministic Finite Automaton), 
                  DFA(Deterministic Finite Automaton), 그리고 최종적으로 최소화된 DFA를 생성하는 전체 과정을 학습할 수 있습니다.
                  각 탭을 클릭하여 해당 변환 과정을 직접 실행하고 시각화된 결과를 확인해보세요.
                </p>
                
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 rounded-r-md">
                    <h4 className="font-semibold text-indigo-700 dark:text-indigo-300">1. Regex → NFA 변환</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      'Regex → NFA' 탭에서 정규 표현식을 입력하고 톰슨 구성법(Thompson's Construction)을 통해 NFA로 변환합니다.
                    </p>
                  </div>
                  <div className="p-3 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/30 rounded-r-md">
                    <h4 className="font-semibold text-purple-700 dark:text-purple-300">2. NFA → DFA 변환</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      'NFA → DFA' 탭에서 NFA를 입력(또는 이전 단계의 결과를 참고)하여 부분집합 구성법(Subset Construction)을 통해 DFA로 변환합니다.
                    </p>
                  </div>
                  <div className="p-3 border-l-4 border-pink-500 bg-pink-50 dark:bg-pink-900/30 rounded-r-md">
                    <h4 className="font-semibold text-pink-700 dark:text-pink-300">3. DFA 최소화</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      'DFA 최소화' 탭에서 DFA를 입력(또는 이전 단계의 결과를 참고)하여 상태 동등성 원리(테이블 채우기 알고리즘 등)를 통해 최소 DFA를 생성합니다.
                    </p>
                  </div>
                </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  각 탭의 도구는 독립적으로 작동합니다. 한 단계의 출력을 다음 단계의 입력으로 사용하려면 해당 정의(예: 상태, 전이)를 수동으로 복사하여 붙여넣어야 할 수 있습니다.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="regex-nfa">
              <RegexToNfaVisualizer />
            </TabsContent>

            <TabsContent value="nfa-dfa">
              <NfaToDfaVisualizer />
            </TabsContent>

            <TabsContent value="minimization">
              <DfaMinimizationVisualizer />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
