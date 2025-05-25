"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, RotateCcw } from "lucide-react"

// Define the interface for GC objects
interface GcObject {
  id: number;
  name: string;
  isRoot: boolean;
  isMarked: boolean;
  isGarbage: boolean;
  references: number[];
}

export default function GarbageCollectionVisualizer() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [objects, setObjects] = useState<GcObject[]>([
    { id: 1, name: "Obj1", isRoot: true, isMarked: false, isGarbage: false, references: [2, 3] },
    { id: 2, name: "Obj2", isRoot: false, isMarked: false, isGarbage: false, references: [3] },
    { id: 3, name: "Obj3", isRoot: false, isMarked: false, isGarbage: false, references: [] },
    { id: 4, name: "Obj4", isRoot: true, isMarked: false, isGarbage: false, references: [5] },
    { id: 5, name: "Obj5", isRoot: false, isMarked: false, isGarbage: false, references: [] },
    { id: 6, name: "Obj6", isRoot: false, isMarked: false, isGarbage: false, references: [7] },
    { id: 7, name: "Obj7", isRoot: false, isMarked: false, isGarbage: false, references: [6] }
  ])

  const steps = [
    "초기 상태: 모든 객체가 unmarked 상태",
    "Mark 단계 시작: 루트 객체들 식별",
    "Obj1 (루트) 마킹",
    "Obj1에서 참조하는 Obj2, Obj3 마킹",
    "Obj4 (루트) 마킹", 
    "Obj4에서 참조하는 Obj5 마킹",
    "Mark 단계 완료: 도달 가능한 객체들 모두 마킹됨",
    "Sweep 단계: 마킹되지 않은 객체들을 가비지로 식별",
    "GC 완료: Obj6, Obj7이 가비지로 수거됨"
  ]

  const runMarkAndSweep = () => {
    setIsRunning(true)
    let step = 0
    
    const interval = setInterval(() => {
      setCurrentStep(step)
      
      setObjects((prevObjects: GcObject[]) => {
        const newObjects = [...prevObjects]
        
        switch(step) {
          case 0: // 초기 상태
            newObjects.forEach((obj: GcObject) => {
              obj.isMarked = false
              obj.isGarbage = false
            })
            break
          case 1: // 루트 식별
            break
          case 2: // Obj1 마킹
            newObjects[0].isMarked = true
            break
          case 3: // Obj1 참조 마킹
            newObjects[1].isMarked = true // Obj2
            newObjects[2].isMarked = true // Obj3
            break
          case 4: // Obj4 마킹
            newObjects[3].isMarked = true
            break
          case 5: // Obj4 참조 마킹
            newObjects[4].isMarked = true // Obj5
            break
          case 6: // Mark 완료
            break
          case 7: // Sweep 시작
            newObjects.forEach((obj: GcObject) => {
              if (!obj.isMarked) {
                obj.isGarbage = true
              }
            })
            break
          case 8: // GC 완료
            break
        }
        
        return newObjects
      })
      
      step++
      if (step >= steps.length) {
        clearInterval(interval)
        setIsRunning(false)
      }
    }, 1500)
  }

  const reset = () => {
    setCurrentStep(0)
    setIsRunning(false)
    setObjects((prevObjects: GcObject[]) => 
      prevObjects.map((obj: GcObject) => ({
        ...obj,
        isMarked: false,
        isGarbage: false
      }))
    )
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      // 수동으로 다음 단계 실행
      runMarkAndSweep()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mark-and-Sweep GC 시뮬레이터</CardTitle>
          <CardDescription>
            가비지 컬렉션의 Mark-and-Sweep 알고리즘을 시각적으로 학습합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 제어 패널 */}
          <div className="flex gap-2">
            <Button onClick={runMarkAndSweep} disabled={isRunning} className="flex items-center">
              <Play className="h-4 w-4 mr-2" />
              GC 실행
            </Button>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              초기화
            </Button>
          </div>

          {/* 현재 단계 표시 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">단계 {currentStep + 1} / {steps.length}</h3>
              <Badge variant={currentStep < 6 ? "default" : currentStep < 8 ? "secondary" : "destructive"}>
                {currentStep < 6 ? "Mark 단계" : currentStep < 8 ? "Sweep 단계" : "완료"}
              </Badge>
            </div>
            <p className="text-sm text-gray-700">{steps[currentStep]}</p>
          </div>

          {/* 객체 그래프 시각화 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">객체 참조 그래프</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-6 rounded-lg">
                <svg width="100%" height="400" viewBox="0 0 800 400">
                  {/* 객체들 */}
                  {objects.map((obj: GcObject, index: number) => {
                    const positions = [
                      { x: 100, y: 100 }, // Obj1
                      { x: 250, y: 50 },  // Obj2
                      { x: 250, y: 150 }, // Obj3
                      { x: 100, y: 250 }, // Obj4
                      { x: 250, y: 250 }, // Obj5
                      { x: 500, y: 100 }, // Obj6
                      { x: 500, y: 200 }  // Obj7
                    ]
                    const pos = positions[index]
                    
                    return (
                      <g key={obj.id}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={30}
                          fill={
                            obj.isGarbage ? "#ef4444" :
                            obj.isMarked ? "#10b981" :
                            obj.isRoot ? "#3b82f6" : "#e5e7eb"
                          }
                          stroke="#374151"
                          strokeWidth="2"
                        />
                        <text
                          x={pos.x}
                          y={pos.y + 5}
                          textAnchor="middle"
                          className="text-sm font-semibold"
                          fill={obj.isGarbage || obj.isMarked || obj.isRoot ? "white" : "#374151"}
                        >
                          {obj.name}
                        </text>
                      </g>
                    )
                  })}
                  {/* 참조선 */}
                  {objects.map((obj: GcObject, index: number) => {
                    const positions = [
                      { x: 100, y: 100 }, // Obj1
                      { x: 250, y: 50 },  // Obj2
                      { x: 250, y: 150 }, // Obj3
                      { x: 100, y: 250 }, // Obj4
                      { x: 250, y: 250 }, // Obj5
                      { x: 500, y: 100 }, // Obj6
                      { x: 500, y: 200 }  // Obj7
                    ]
                    const pos = positions[index]
                    
                    return (
                      <g key={obj.id}>
                        {obj.references.map((ref: number) => {
                          const refPos = positions[ref - 1]
                          
                          return (
                            <line
                              key={ref}
                              x1={pos.x}
                              y1={pos.y}
                              x2={refPos.x}
                              y2={refPos.y}
                              stroke="#374151"
                              strokeWidth="2"
                            />
                          )
                        })}
                      </g>
                    )
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
