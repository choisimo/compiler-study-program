"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, RotateCcw, ArrowRight } from "lucide-react"

// Added type definitions
interface ParsingStep {
  stack: string;
  input: string;
  action: string;
}

interface ExampleOption {
  label: string;
  value: string; // This is the input string for the example
}

interface LL1Table {
  [nonTerminal: string]: {
    [terminal: string]: string;
  };
}

interface SLRTableAction {
  [symbol: string]: string; // e.g., "s2", "r1", "accept", or a state number for GOTO
}

interface SLRTable {
  [state: number]: SLRTableAction;
}

type ExampleSet = {
  [inputString: string]: ParsingStep[];
};

interface ParsingVisualizerProps {
  type: "ll1" | "slr1" | "lalr1"
}

const ll1TableData: LL1Table = {
  E: { a: "E → TE'", "(": "E → TE'" },
  "E'": { "+": "E' → +TE'", ")": "E' → ε", "$": "E' → ε" },
  T: { a: "T → FT'", "(": "T → FT'" },
  "T'": { "+": "T' → ε", "*": "T' → *FT'", ")": "T' → ε", "$": "T' → ε" },
  F: { a: "F → a", "(": "F → (E)" },
};

const slrTableData: SLRTable = {
  0: { n: "s2", E: "1" },
  1: { "+": "s3", "$": "accept" },
  2: { "+": "r2", "$": "r2" },
  3: { n: "s4" }, 
  4: { "+": "r1", "$": "r1" },
};

const ll1ExampleSet: ExampleSet = {
  "a+a$": [
    { stack: "$E", input: "a+a$", action: "E → TE'" },
    { stack: "$E'T", input: "a+a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a+a$", action: "F → a" },
    { stack: "$E'T'a", input: "a+a$", action: "Match a" },
    { stack: "$E'T'", input: "+a$", action: "T' → ε" },
    { stack: "$E'", input: "+a$", action: "E' → +TE'" },
    { stack: "$E'T+", input: "+a$", action: "Match +" },
    { stack: "$E'T", input: "a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a$", action: "F → a" },
    { stack: "$E'T'a", input: "a$", action: "Match a" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "a$": [
    { stack: "$E", input: "a$", action: "E → TE'" },
    { stack: "$E'T", input: "a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a$", action: "F → a" },
    { stack: "$E'T'a", input: "a$", action: "Match a" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "(a)$": [
    { stack: "$E", input: "(a)$", action: "E → TE'" },
    { stack: "$E'T", input: "(a)$", action: "T → FT'" },
    { stack: "$E'T'F", input: "(a)$", action: "F → (E)" },
    { stack: "$E'T')E(", input: "(a)$", action: "Match (" },
    { stack: "$E'T')E", input: "a)$", action: "E → TE'" },
    { stack: "$E'T')E'T", input: "a)$", action: "T → FT'" },
    { stack: "$E'T')E'T'F", input: "a)$", action: "F → a" },
    { stack: "$E'T')E'T'a", input: "a)$", action: "Match a" },
    { stack: "$E'T')E'T'", input: ")$", action: "T' → ε" },
    { stack: "$E'T')E'", input: ")$", action: "E' → ε" },
    { stack: "$E'T')", input: ")$", action: "Match )" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "a*a$": [
    { stack: "$E", input: "a*a$", action: "E → TE'" },
    { stack: "$E'T", input: "a*a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a*a$", action: "F → a" },
    { stack: "$E'T'a", input: "a*a$", action: "Match a" },
    { stack: "$E'T'", input: "*a$", action: "T' → *FT'" },
    { stack: "$E'T'F*", input: "*a$", action: "Match *" }, 
    { stack: "$E'T'F", input: "a$", action: "F → a" }, 
    { stack: "$E'T'a", input: "a$", action: "Match a" }, 
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
};

const slrExampleSet: ExampleSet = {
  "n+n$": [
    { stack: "$0", input: "n+n$", action: "Shift 2" },        
    { stack: "$0n2", input: "+n$", action: "Reduce E→n" },    
    { stack: "$0E1", input: "+n$", action: "Shift 3" },        
    { stack: "$0E1+3", input: "n$", action: "Shift 4" },       
    { stack: "$0E1+3n4", input: "$", action: "Reduce E→n" },   
    { stack: "$0E1+3E5", input: "$", action: "Reduce E→E+E" },//
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
  "n$": [
    { stack: "$0", input: "n$", action: "Shift 2" },
    { stack: "$0n2", input: "$", action: "Reduce E→n" },
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
  "n+n+n$": [
    { stack: "$0", input: "n+n+n$", action: "Shift 2" },
    { stack: "$0n2", input: "+n+n$", action: "Reduce E→n" },
    { stack: "$0E1", input: "+n+n$", action: "Shift 3" },
    { stack: "$0E1+3", input: "n+n$", action: "Shift 4" },
    { stack: "$0E1+3n4", input: "+n$", action: "Reduce E→n" }, 
    { stack: "$0E1+3E5", input: "+n$", action: "Reduce E→E+E" },
    { stack: "$0E1", input: "+n$", action: "Shift 3" }, 
    { stack: "$0E1+3", input: "n$", action: "Shift 4" },
    { stack: "$0E1+3n4", input: "$", action: "Reduce E→n" },
    { stack: "$0E1+3E5", input: "$", action: "Reduce E→E+E" },
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
};

const lalr1ExampleSet: ExampleSet = {
  "ab$": [
    { stack: "$0", input: "ab$", action: "Shift a" },
    { stack: "$0aX", input: "b$", action: "Reduce A → a" }, 
    { stack: "$0AZ", input: "b$", action: "Shift b" },      
    { stack: "$0AZbW", input: "$", action: "Reduce B → b" }, 
    { stack: "$0AZBU", input: "$", action: "Reduce S → AB" },//
    { stack: "$0SP", input: "$", action: "Accept" }        
  ],
  "x=x$": [
    { stack: "$0", input: "x=x$", action: "Shift x (V)" },
    { stack: "$0x_V1", input: "=x$", action: "Reduce E → V" }, 
    { stack: "$0E2", input: "=x$", action: "Shift =" },
    { stack: "$0E2=3", input: "x$", action: "Shift x (V)" },
    { stack: "$0E2=3x_V4", input: "$", action: "Reduce E → V" }, 
    { stack: "$0E2=3E5", input: "$", action: "Reduce S → V = E" }, 
    { stack: "$0S_accept", input: "$", action: "Accept" }
  ]
};

const ll1ParsingExamples: ExampleOption[] = [
  { value: "a+a$", label: "LL(1): a+a$" }, 
  { value: "a$", label: "LL(1): a$" },
  { value: "(a)$", label: "LL(1): (a)$" },
  { value: "a*a$", label: "LL(1): a*a$" },
];

const slrParsingExamples: ExampleOption[] = [
  { value: "n+n$", label: "SLR(1): n+n$" },
  { value: "n$", label: "SLR(1): n$" },
  { value: "n+n+n$", label: "SLR(1): n+n+n$" },
];

const lalr1ParsingExamples: ExampleOption[] = [
  { value: "ab$", label: "LALR(1): ab$" },
  { value: "x=x$", label: "LALR(1): x=x$" },
];

export default function ParsingVisualizer({ type }: ParsingVisualizerProps) {
  const [selectedExample, setSelectedExample] = useState<string>(() => {
    let examples;
    let defaultExampleValue;
    if (type === "ll1") {
      examples = ll1ParsingExamples;
      defaultExampleValue = "a+a$";
    } else if (type === "slr1") {
      examples = slrParsingExamples;
      defaultExampleValue = "n+n$";
    } else { // lalr1
      examples = lalr1ParsingExamples;
      defaultExampleValue = "ab$";
    }
    return examples.length > 0 ? examples[0].value : defaultExampleValue;
  });

  const [inputString, setInputString] = useState<string>(selectedExample);
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const ll1Table: LL1Table = ll1TableData; 
  const slrTable: SLRTable = slrTableData;
  // Placeholder for LALR(1) table if we were to implement actual parsing
  // const lalr1Table: SLRTable = {}; 

  const currentExampleSet: ExampleSet = 
    type === "ll1" ? ll1ExampleSet : 
    type === "slr1" ? slrExampleSet : 
    lalr1ExampleSet; // Added LALR(1) case

  const steps: ParsingStep[] = currentExampleSet[selectedExample] || [];

  useEffect(() => {
    let examples;
    let defaultExampleValue;
    if (type === "ll1") {
      examples = ll1ParsingExamples;
      defaultExampleValue = "a+a$";
    } else if (type === "slr1") {
      examples = slrParsingExamples;
      defaultExampleValue = "n+n$";
    } else { // lalr1
      examples = lalr1ParsingExamples;
      defaultExampleValue = "ab$";
    }
    const newSelectedExample = examples.length > 0 ? examples[0].value : defaultExampleValue;
    setSelectedExample(newSelectedExample);
    setInputString(newSelectedExample); // Initialize input string with the default example
    setCurrentStep(0);
    setIsRunning(false);
  }, [type]);

  useEffect(() => {
    setInputString(selectedExample);
    setCurrentStep(0);
    setIsRunning(false);
  }, [selectedExample]);

  useEffect(() => {
    let timer: NodeJS.Timeout | number;
    if (isRunning && steps.length > 0 && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep((prev: number) => prev + 1);
      }, 500);
    } else if (isRunning && currentStep >= steps.length - 1) {
      setIsRunning(false);
    }
    return () => clearTimeout(timer as number);
  }, [isRunning, currentStep, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
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
    setIsRunning(false)
    setInputString(selectedExample);
  }

  const runAll = () => {
    setCurrentStep(0)
    setIsRunning(true)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputString(newValue);
    const currentParserExamples = type === "ll1" ? ll1ParsingExamples : type === "slr1" ? slrParsingExamples : lalr1ParsingExamples;
    const matchingExample = currentParserExamples.find(ex => ex.value === newValue);
    if (matchingExample) {
      if (selectedExample !== newValue) { 
         setSelectedExample(newValue); 
      }
    } else {
      setCurrentStep(0);
      setIsRunning(false);
    }
  };

  const handleExampleChange = (value: string) => {
    if (selectedExample !== value) {
      setSelectedExample(value); 
    }
  };

  const placeholderText = type === "ll1" 
    ? "Try: a+a$, a$, (a)$, a*a$"
    : type === "slr1" ? "Try: n+n$, n$, n+n+n$" : "Try: ab$, x=x$";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{type === "ll1" ? "LL(1) 파싱 시뮬레이터" : type === "slr1" ? "SLR(1) 파싱 시뮬레이터" : "LALR(1) 파싱 시뮬레이터"}</CardTitle>
          <CardDescription>
            {type === "ll1" ? "하향식 파싱 과정을 단계별로 시각화합니다" : type === "slr1" ? "상향식 파싱 과정을 단계별로 시각화합니다" : "상향식 파싱 과정을 단계별로 시각화합니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 입력 설정 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input" className="text-sm font-medium">
                입력 문자열 ({type.toUpperCase()})
              </Label>
              <Input id="input" value={inputString} onChange={handleInputChange} placeholder={placeholderText} />
            </div>
            <div className="flex-grow">
              <Label htmlFor="example-select" className="text-sm font-medium">
                예제 선택
              </Label>
              <Select onValueChange={handleExampleChange} value={selectedExample}>
                <SelectTrigger id="example-select">
                  <SelectValue placeholder="예제 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(type === "ll1" ? ll1ParsingExamples : 
                     type === "slr1" ? slrParsingExamples : 
                     lalr1ParsingExamples).map((example) => (
                    <SelectItem key={example.value} value={example.value}>
                      {example.label} 
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={runAll} disabled={isRunning} className="flex items-center">
                <Play className="h-4 w-4 mr-2" />
                자동 실행
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                초기화
              </Button>
            </div>
          </div>

          {/* 파싱 테이블 */}
          <Tabs defaultValue="table" className="space-y-4">
            <TabsList>
              <TabsTrigger value="table">파싱 테이블</TabsTrigger>
              <TabsTrigger value="trace">파싱 추적</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {type === "ll1" ? "LL(1) 파싱 테이블" : type === "slr1" ? "SLR(1) 파싱 테이블" : "LALR(1) 파싱 테이블"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {type === "ll1" ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 border-r">M</th>
                            <th className="text-left p-2">a</th>
                            <th className="text-left p-2">+</th>
                            <th className="text-left p-2">*</th>
                            <th className="text-left p-2">(</th>
                            <th className="text-left p-2">)</th>
                            <th className="text-left p-2">$</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">E</td>
                            <td className="p-2 text-xs">E → TE'</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">E → TE'</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">E'</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">E' → +TE'</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">E' → ε</td>
                            <td className="p-2 text-xs">E' → ε</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">T</td>
                            <td className="p-2 text-xs">T → FT'</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">T → FT'</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">T'</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">T' → ε</td>
                            <td className="p-2 text-xs">T' → *FT'</td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">T' → ε</td>
                            <td className="p-2 text-xs">T' → ε</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">F</td>
                            <td className="p-2 text-xs">F → a</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 text-xs">F → (E)</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : type === "slr1" ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 border-r">상태</th>
                            <th className="text-left p-2">n</th>
                            <th className="text-left p-2">+</th>
                            <th className="text-left p-2">$</th>
                            <th className="text-left p-2 border-l">E</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">0</td>
                            <td className="p-2">s2</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 border-l">1</td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">1</td>
                            <td className="p-2"></td>
                            <td className="p-2">s3</td>
                            <td className="p-2">accept</td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">2</td>
                            <td className="p-2">r2</td>
                            <td className="p-2">r2</td>
                            <td className="p-2">r2</td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">3</td>
                            <td className="p-2">s4</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">4</td>
                            <td className="p-2">r1</td>
                            <td className="p-2">r1</td>
                            <td className="p-2">r1</td>
                            <td className="p-2 border-l"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 border-r">상태</th>
                            <th className="text-left p-2">a</th>
                            <th className="text-left p-2">b</th>
                            <th className="text-left p-2">$</th>
                            <th className="text-left p-2 border-l">A</th>
                            <th className="text-left p-2 border-l">B</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">0</td>
                            <td className="p-2">sX</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2 border-l"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">X</td>
                            <td className="p-2"></td>
                            <td className="p-2">sW</td>
                            <td className="p-2">rA</td>
                            <td className="p-2 border-l"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">W</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2">rB</td>
                            <td className="p-2 border-l"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">Z</td>
                            <td className="p-2"></td>
                            <td className="p-2">sU</td>
                            <td className="p-2"></td>
                            <td className="p-2 border-l"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                          <tr className="border-b">
                            <td className="p-2 border-r font-medium">U</td>
                            <td className="p-2"></td>
                            <td className="p-2"></td>
                            <td className="p-2">rS</td>
                            <td className="p-2 border-l"></td>
                            <td className="p-2 border-l"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trace">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">파싱 과정 추적</CardTitle>
                  <CardDescription>
                    단계 {currentStep + 1} / {steps.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 현재 단계 표시 */}
                  {steps.length > 0 ? (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">스택:</span>
                          <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.stack || "N/A"}</div>
                        </div>
                        <div>
                          <span className="font-medium">입력:</span>
                          <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.input || "N/A"}</div>
                        </div>
                        <div>
                          <span className="font-medium">동작:</span>
                          <div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.action || "N/A"}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">선택된 예제에 대한 파싱 단계가 없거나, 현재 입력 문자열에 해당하는 예제가 없습니다.</p>
                  )}
 
                  {/* 제어 버튼 */}
                  <div className="flex gap-2">
                    <Button onClick={prevStep} disabled={currentStep === 0} variant="outline" size="sm">
                      이전 단계
                    </Button>
                    <Button onClick={nextStep} disabled={currentStep === steps.length - 1} size="sm">
                      다음 단계
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  {/* 전체 추적 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">단계</th>
                          <th className="text-left p-2">스택</th>
                          <th className="text-left p-2">입력</th>
                          <th className="text-left p-2">동작</th>
                        </tr>
                      </thead>
                      <tbody>
                        {steps.map((step, index) => (
                          <tr key={index} className={`border-b dark:border-gray-700 ${index === currentStep ? "bg-blue-100 dark:bg-blue-900/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                            <td className="p-2 font-medium">{index + 1}</td>
                            <td className="p-2 font-mono">{step.stack}</td>
                            <td className="p-2 font-mono">{step.input}</td>
                            <td className="p-2 whitespace-nowrap">{step.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
