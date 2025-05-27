"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, RotateCcw as ResetIcon, StepBack, StepForward } from 'lucide-react'; // Removed ArrowRight as it's not directly used

// Import types and functions from utility files
import { NfaState, NfaTransition, NfaOutput } from './lib/automata-helpers'; // Assuming NfaFragment is not needed here
import { 
    preprocessRegex, 
    infixToPostfix, 
    thompsonConstruction, 
    executeNfa,
    NfaExecutionStep, // This type is specific to regex-nfa-algorithms
    // NfaFragment is internal to thompsonConstruction, so not exported/imported here
    resetThompsonStateCounter // To reset the counter for each construction
} from './lib/regex-nfa-algorithms';


export default function RegexToNfaVisualizer() {
  const [regexInput, setRegexInput] = useState<string>("(a|b)*abb");
  const [postfixRegex, setPostfixRegex] = useState<string>("");
  const [constructedNfa, setConstructedNfa] = useState<NfaOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [nfaInputForExec, setNfaInputForExec] = useState<string>("aabb");
  const [nfaExecSteps, setNfaExecSteps] = useState<NfaExecutionStep[]>([]);
  const [currentNfaExecStepIdx, setCurrentNfaExecStepIdx] = useState<number>(0);
  const [nfaExecResult, setNfaExecResult] = useState<"Not Started" | "Running" | "Accepted" | "Rejected">("Not Started");
  const [isNfaAutoPlaying, setIsNfaAutoPlaying] = useState<boolean>(false);

  const handleConvertToNfa = () => {
    setErrorMessage(null);
    setConstructedNfa(null);
    setPostfixRegex("");
    resetThompsonStateCounter(); // Reset state counter from the library
    handleNfaExecReset(); // Reset NFA execution state

    if (!regexInput.trim()) {
      setErrorMessage("Regular expression cannot be empty.");
      return;
    }
    try {
      const processedRegex = preprocessRegex(regexInput);
      const postfix = infixToPostfix(processedRegex);
      setPostfixRegex(postfix);
      const nfa = thompsonConstruction(postfix);
      setConstructedNfa(nfa);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred during NFA construction.");
      console.error(error);
    }
  };
  
  const handleRunNfaExecution = (runAll = false) => {
    if (!constructedNfa) {
      setNfaExecResult("Rejected");
      setNfaExecSteps([{ 
        step:0, currentNfaStateIds: new Set(), symbolProcessed:null, inputSymbol:null, remainingInput:nfaInputForExec, 
        statesAfterMove: null, statesAfterClosure: null, actionMessage: "NFA not constructed."
      }]);
      return;
    }
    const { steps, result } = executeNfa(constructedNfa, nfaInputForExec);
    setNfaExecSteps(steps);
    setNfaExecResult(result);
    setCurrentNfaExecStepIdx(runAll ? steps.length - 1 : 0);
    if(runAll) setIsNfaAutoPlaying(false);
  };

  const handleNfaExecNext = () => {
    if (currentNfaExecStepIdx < nfaExecSteps.length - 1) setCurrentNfaExecStepIdx(prev => prev + 1);
  };
  const handleNfaExecPrev = () => {
    if (currentNfaExecStepIdx > 0) setCurrentNfaExecStepIdx(prev => prev - 1);
  };
  const handleNfaExecReset = () => {
    setNfaExecSteps([]); setCurrentNfaExecStepIdx(0); setNfaExecResult("Not Started"); setIsNfaAutoPlaying(false);
  };
  const handleNfaAutoPlay = () => {
    if (nfaExecSteps.length === 0 && constructedNfa) handleRunNfaExecution(false);
    setIsNfaAutoPlaying(true); setCurrentNfaExecStepIdx(0);
  };

  useEffect(() => { 
    let timer: NodeJS.Timeout;
    if (isNfaAutoPlaying && currentNfaExecStepIdx < nfaExecSteps.length - 1) {
      timer = setTimeout(() => setCurrentNfaExecStepIdx(prev => prev + 1), 1000);
    } else if (isNfaAutoPlaying) {
      setIsNfaAutoPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isNfaAutoPlaying, currentNfaExecStepIdx, nfaExecSteps.length]);


  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Regex to NFA Converter (Thompson's Construction)</CardTitle>
        <CardDescription>Enter a regular expression to convert it to an NFA. ε can be used for epsilon.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-grow space-y-1">
            <Label htmlFor="regex-input">Regular Expression</Label>
            <Input id="regex-input" value={regexInput} onChange={(e) => setRegexInput(e.target.value)} placeholder="e.g., (a|b)*.a.b.b or a|ε.b" />
          </div>
          <Button onClick={handleConvertToNfa}>Convert to NFA</Button>
        </div>

        {errorMessage && <p className="text-red-500 bg-red-100 p-2 rounded-md dark:bg-red-900/30 dark:text-red-300">{errorMessage}</p>}
        {postfixRegex && (
          <div><h4 className="font-semibold">Postfix Regex:</h4><pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded-md">{postfixRegex}</pre></div>
        )}
        {constructedNfa && (
          <div>
            <h3 className="text-lg font-semibold mt-4 mb-2">Constructed NFA:</h3>
            <div className="space-y-1 p-2 border rounded-md bg-gray-50 dark:bg-gray-800/30 text-xs">
              <p><strong>Alphabet:</strong> {`{${constructedNfa.alphabet.join(', ')}}`}</p>
              <p><strong>States:</strong> {`{${constructedNfa.states.map(s => s.id).sort().join(', ')}}`}</p>
              <p><strong>Start State:</strong> {constructedNfa.startStateId}</p>
              <p><strong>Accept State(s):</strong> {`{${constructedNfa.acceptStateIds.join(', ')}}`}</p>
              <h4 className="font-semibold mt-1">Transitions (ε for epsilon):</h4>
              <ul className="list-disc pl-5 max-h-40 overflow-y-auto">
                {constructedNfa.transitions.map((t, i) => (
                  <li key={i}>δ({t.from}, {t.symbol === null ? 'ε' : `'${t.symbol}'`}) = {`{${t.to}}`}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* NFA Execution Section */}
    {constructedNfa && (
      <Card>
        <CardHeader>
          <CardTitle>NFA Execution</CardTitle>
          <CardDescription>Test the constructed NFA with an input string.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-grow space-y-1">
              <Label htmlFor="nfa-exec-input">Input String for NFA</Label>
              <Input id="nfa-exec-input" value={nfaInputForExec} onChange={(e) => setNfaInputForExec(e.target.value)} placeholder="e.g., aabb" />
            </div>
            <Button onClick={() => handleRunNfaExecution(true)} disabled={isNfaAutoPlaying}>Run All</Button>
            <Button onClick={handleNfaAutoPlay} disabled={isNfaAutoPlaying || (nfaExecSteps.length > 0 && currentNfaExecStepIdx === nfaExecSteps.length -1)} variant="outline">
              <Play className="h-4 w-4 mr-2" /> Auto Play
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleNfaExecPrev} disabled={currentNfaExecStepIdx === 0 || isNfaAutoPlaying || nfaExecSteps.length === 0} variant="outline" size="icon"><StepBack className="h-4 w-4"/></Button>
            <Button onClick={handleNfaExecNext} disabled={currentNfaExecStepIdx >= nfaExecSteps.length - 1 || isNfaAutoPlaying || nfaExecSteps.length === 0} variant="outline" size="icon"><StepForward className="h-4 w-4"/></Button>
            <Button onClick={handleNfaExecReset} disabled={isNfaAutoPlaying || nfaExecSteps.length === 0} variant="outline" size="icon"><ResetIcon className="h-4 w-4"/></Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Step: {nfaExecSteps.length > 0 ? currentNfaExecStepIdx + 1 : 0} / {nfaExecSteps.length}</span>
          </div>

          {nfaExecSteps.length > 0 && (
            <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800/50 text-sm space-y-1">
              <p><strong>Current Active NFA States:</strong> <code className="bg-blue-100 dark:bg-blue-700/50 px-1 rounded">{`{${Array.from(nfaExecSteps[currentNfaExecStepIdx].currentNfaStateIds).sort().join(',')}}`}</code></p>
              <p><strong>Input: </strong> 
                <span className="font-mono">
                  <span className="text-gray-400 dark:text-gray-500">{nfaInputForExec.substring(0, nfaInputForExec.length - nfaExecSteps[currentNfaExecStepIdx].remainingInput.length - (nfaExecSteps[currentNfaExecStepIdx].inputSymbol ? 1:0) )}</span>
                  <span className="text-red-500 underline">{nfaExecSteps[currentNfaExecStepIdx].inputSymbol || ""}</span>
                  <span>{nfaExecSteps[currentNfaExecStepIdx].remainingInput}</span>
                </span>
              </p>
              <p><strong>Action:</strong> {nfaExecSteps[currentNfaExecStepIdx].actionMessage}</p>
              {nfaExecSteps[currentNfaExecStepIdx].statesAfterMove && <p className="text-xs">States after move on '{nfaExecSteps[currentNfaExecStepIdx].symbolProcessed}': {`{${Array.from(nfaExecSteps[currentNfaExecStepIdx].statesAfterMove!).sort().join(',')}}`}</p>}
              {nfaExecSteps[currentNfaExecStepIdx].statesAfterClosure && nfaExecSteps[currentNfaExecStepIdx].symbolProcessed && <p className="text-xs">States after ε-closure: {`{${Array.from(nfaExecSteps[currentNfaExecStepIdx].statesAfterClosure!).sort().join(',')}}`}</p>}
            </div>
          )}
          {nfaExecResult !== "Not Started" && nfaExecResult !== "Running" && (
            <p className={`font-semibold text-lg ${nfaExecResult === "Accepted" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>Result: {nfaExecResult}</p>
          )}
        </CardContent>
      </Card>
    )}
    </div>
  );
}
