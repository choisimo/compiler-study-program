import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, Play, RotateCcw as ResetIcon, StepBack, StepForward } from 'lucide-react';
import { StateDiagram } from './StateDiagram';

// Import types and helpers from the new lib file
import {
  NfaState,
  NfaTransition,
  NfaOutput as Nfa, // Use NfaOutput as the Nfa type for this component
  DfaStateData,
  DfaTransitionData,
  Dfa,
  DfaExecutionStep,
  calculateEpsilonClosure,
  calculateMove,
  executeDfa
} from './lib/automata-helpers';


// Interface for detailed step breakdown of NFA to DFA conversion
interface NfaToDfaStepDetail {
  dfaStateBeingProcessedId: string;
  symbol: string;
  nfaStatesForMove: Set<string>;
  moveOutputNfaStates: Set<string>;
  epsilonClosureInputNfaStates: Set<string>;
  epsilonClosureOutputNfaStates: Set<string>;
  targetDfaStateId: string;
  isNewDfaState: boolean;
  transitionCreated: boolean;
}


// --- Initial Hardcoded NFA Example (accepts strings ending in "ab") ---
const exampleNfa: Nfa = {
  states: [
    { id: "q0", isStartState: true },
    { id: "q1" },
    { id: "q2", isAcceptState: true },
  ],
  alphabet: ["a", "b"],
  transitions: [
    { from: "q0", to: "q0", symbol: "a" },
    { from: "q0", to: "q1", symbol: "a" },
    { from: "q0", to: "q0", symbol: "b" },
    { from: "q1", to: "q2", symbol: "b" },
  ],
  startStateId: "q0",
  acceptStateIds: ["q2"],
};

// Local helper functions calculateEpsilonClosure and calculateMove are now removed,
// as they are imported from automata-helpers.ts

export default function NfaToDfaVisualizer() {
  const [nfaInput, setNfaInput] = useState<Nfa>(exampleNfa); // Renamed for clarity if user input for NFA is added later
  const [dfa, setDfa] = useState<Dfa>({
    states: [],
    alphabet: nfaInput.alphabet, // Initialize with NFA's alphabet
    transitions: [],
    startStateId: null,
    acceptStateIds: [],
  });
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("NFA to DFA conversion initialized.");
  const [dfaStatesProcessed, setDfaStatesProcessed] = useState<DfaStateData[]>([]);
  const [dfaStatesToProcess, setDfaStatesToProcess] = useState<DfaStateData[]>([]);
  const [currentStepBreakdown, setCurrentStepBreakdown] = useState<NfaToDfaStepDetail[]>([]); // Use specific type

  // --- State for DFA Execution Visualization ---
  const [dfaInputForExec, setDfaInputForExec] = useState<string>("aab");
  const [dfaExecSteps, setDfaExecSteps] = useState<DfaExecutionStep[]>([]); // Uses imported DfaExecutionStep
  const [currentDfaExecStepIdx, setCurrentDfaExecStepIdx] = useState<number>(0);
  const [dfaExecResult, setDfaExecResult] = useState<"Not Started" | "Running" | "Accepted" | "Rejected">("Not Started");
  const [isDfaAutoPlaying, setIsDfaAutoPlaying] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);


  const resetDfaConstruction = useCallback(() => {
    const initialNfaStartStateSet = new Set([nfaInput.startStateId]);
    // Pass nfaInput to helpers, which expect NfaOutput type (compatible)
    const initialDfaStartStateNfaIds = calculateEpsilonClosure(initialNfaStartStateSet, nfaInput);
    const initialDfaStartStateId = `{${Array.from(initialDfaStartStateNfaIds).sort().join(',')}}`;

    const initialDfaStateData: DfaStateData = {
      id: initialDfaStartStateId,
      nfaStateIds: initialDfaStartStateNfaIds,
      isStartState: true,
      isAcceptState: Array.from(initialDfaStartStateNfaIds).some(id => nfaInput.acceptStateIds.includes(id))
    };

    setDfa({
      states: [initialDfaStateData],
      alphabet: nfaInput.alphabet,
      transitions: [],
      startStateId: initialDfaStateData.id,
      acceptStateIds: initialDfaStateData.isAcceptState ? [initialDfaStateData.id] : []
    });
    setDfaStatesToProcess([initialDfaStateData]);
    setCurrentStepMessage(`Initial DFA state ${initialDfaStateData.id} created from NFA states {${Array.from(initialDfaStartStateNfaIds).sort().join(',')}}. Ready for subset construction.`);
    setCurrentStepBreakdown([]);
    setDfaStatesProcessed([]);
    handleDfaExecReset(); // Reset DFA execution as well
  }, [nfaInput]);

  useEffect(() => {
    resetDfaConstruction();
  }, [resetDfaConstruction]);

  const handleNextStep = () => {
    if (dfaStatesToProcess.length === 0) {
      setCurrentStepMessage("DFA construction complete. No more states to process.");
      setCurrentStepBreakdown([]);
      return;
    }

    const currentDfaStateToProcess = dfaStatesToProcess[0];
    let newDfaStatesCreatedThisStep: DfaStateData[] = [];
    let newDfaTransitionsCreatedThisStep: DfaTransitionData[] = [];
    const stepMessages: string[] = [];
    const localStepBreakdown: NfaToDfaStepDetail[] = []; // Use specific type

    stepMessages.push(`Processing DFA State: ${currentDfaStateToProcess.id} (NFA states: {${Array.from(currentDfaStateToProcess.nfaStateIds || new Set()).sort().join(',')}})`);

    dfa.alphabet.forEach(symbol => { // dfa.alphabet should be set from nfaInput.alphabet
      stepMessages.push(`  For symbol '${symbol}':`);
      // Use imported helpers, pass nfaInput
      const moveResultNfaIds = calculateMove(currentDfaStateToProcess.nfaStateIds || new Set(), symbol, nfaInput);
      stepMessages.push(`    move({${Array.from(currentDfaStateToProcess.nfaStateIds || new Set()).sort().join(',')}}, ${symbol}) = {${Array.from(moveResultNfaIds).sort().join(',')}}`);

      const targetNfaStateIds = calculateEpsilonClosure(moveResultNfaIds, nfaInput);
      stepMessages.push(`    ε-closure({${Array.from(moveResultNfaIds).sort().join(',')}}) = {${Array.from(targetNfaStateIds).sort().join(',')}}`);

      let targetDfaStateId = "";
      let isNewDfa = false;
      let existingDfaState: DfaStateData | undefined = undefined;
      let transitionAdded = false;

      if (targetNfaStateIds.size > 0) {
        targetDfaStateId = `{${Array.from(targetNfaStateIds).sort().join(',')}}`;
        stepMessages.push(`    Resulting NFA state set for DFA: ${targetDfaStateId}`);
        existingDfaState = dfa.states.find(s => s.id === targetDfaStateId) ||
          dfaStatesToProcess.slice(1).find(s => s.id === targetDfaStateId);
        if (!existingDfaState) { // If DFA state doesn't exist yet
          // Check if it's already in the list of states created *this step* but not yet added to main dfa.states
          const alreadyQueuedThisStep = newDfaStatesCreatedThisStep.find(s => s.id === targetDfaStateId);
          if (alreadyQueuedThisStep) {
            existingDfaState = alreadyQueuedThisStep;
            isNewDfa = false; // Not new to the overall DFA if found here, but new in this processing batch
          } else {
            const newDfaStateData: DfaStateData = {
              id: targetDfaStateId,
              nfaStateIds: targetNfaStateIds,
              isAcceptState: Array.from(targetNfaStateIds).some(id => nfaInput.acceptStateIds.includes(id))
            };
            existingDfaState = newDfaStateData;
            newDfaStatesCreatedThisStep.push(newDfaStateData); // Add to batch for this step
            isNewDfa = true;
          }
        } else {
          isNewDfa = false; // It exists in dfa.states or previously in dfaStatesToProcess
        }

        newDfaTransitionsCreatedThisStep.push({
          fromDfaStateId: currentDfaStateToProcess.id,
          toDfaStateId: existingDfaState.id,
          symbol: symbol
        });
        stepMessages.push(`    Transition: ${currentDfaStateToProcess.id} --${symbol}--> ${existingDfaState.id}`);
        transitionAdded = true;
      } else {
        stepMessages.push(`    move(${currentDfaStateToProcess.id}, ${symbol}) results in empty set. No transition.`);
      }

      localStepBreakdown.push({
        dfaStateBeingProcessedId: currentDfaStateToProcess.id,
        symbol: symbol,
        nfaStatesForMove: currentDfaStateToProcess.nfaStateIds || new Set(),
        moveOutputNfaStates: moveResultNfaIds,
        epsilonClosureInputNfaStates: moveResultNfaIds, // Input to epsilon closure is output of move
        epsilonClosureOutputNfaStates: targetNfaStateIds,
        targetDfaStateId: targetDfaStateId, // Can be empty if no states reached
        isNewDfaState: isNewDfa,
        transitionCreated: transitionAdded
      });
    });

    setDfa(prevDfa => {
      // Filter out states that are already in dfa.states or dfaStatesToProcess (beyond the current one)
      const uniqueNewDfaStates = newDfaStatesCreatedThisStep.filter(newState =>
        !prevDfa.states.find(s => s.id === newState.id) &&
        !dfaStatesToProcess.slice(1).find(s => s.id === newState.id)
      );
      return {
        ...prevDfa,
        states: [...prevDfa.states, ...uniqueNewDfaStates],
        transitions: [...prevDfa.transitions, ...newDfaTransitionsCreatedThisStep],
        acceptStateIds: [
          ...prevDfa.acceptStateIds,
          ...uniqueNewDfaStates.filter(s => s.isAcceptState).map(s => s.id)
        ].filter((value, index, self) => self.indexOf(value) === index)
      };
    });

    setDfaStatesProcessed(prev => [...prev, currentDfaStateToProcess]);
    // Add only unique new states to the processing queue
    const trulyNewToQueue = newDfaStatesCreatedThisStep.filter(newState =>
      !dfa.states.find(s => s.id === newState.id) && // Not in current dfa.states
      !dfaStatesToProcess.slice(1).find(s => s.id === newState.id) && // Not in rest of queue
      !newDfaStatesCreatedThisStep.slice(0, newDfaStatesCreatedThisStep.findIndex(s => s.id === newState.id)).find(s => s.id === newState.id) // Not already added in this batch before this instance
    );
    setDfaStatesToProcess(prev => [...prev.slice(1), ...trulyNewToQueue]);

    setCurrentStepMessage(stepMessages.join('\n'));
    setCurrentStepBreakdown(localStepBreakdown);
  };

  // --- DFA Execution Logic (uses imported executeDfa) ---
  const handleRunDfaExecution = (runAll = false) => {
    const { steps, result } = executeDfa(dfa, dfaInputForExec);
    setDfaExecSteps(steps);
    setDfaExecResult(result);
    setCurrentDfaExecStepIdx(runAll && steps.length > 0 ? steps.length - 1 : 0);
    if (runAll) setIsDfaAutoPlaying(false);
  };

  const handleDfaExecNext = () => {
    if (currentDfaExecStepIdx < dfaExecSteps.length - 1) setCurrentDfaExecStepIdx(prev => prev + 1);
  };
  const handleDfaExecPrev = () => {
    if (currentDfaExecStepIdx > 0) setCurrentDfaExecStepIdx(prev => prev - 1);
  };
  const handleDfaExecReset = () => {
    setDfaExecSteps([]); setCurrentDfaExecStepIdx(0); setDfaExecResult("Not Started"); setIsDfaAutoPlaying(false);
  };
  const handleDfaAutoPlay = () => {
    if (dfaExecSteps.length === 0) handleRunDfaExecution(false);
    setIsDfaAutoPlaying(true); setCurrentDfaExecStepIdx(0);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDfaAutoPlaying && currentDfaExecStepIdx < dfaExecSteps.length - 1) {
      timer = setTimeout(() => setCurrentDfaExecStepIdx(prev => prev + 1), 700);
    } else if (isDfaAutoPlaying) {
      setIsDfaAutoPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isDfaAutoPlaying, currentDfaExecStepIdx, dfaExecSteps.length]);

  // Get current NFA and DFA states for visualization
  const currentNfaStates = nfaInput.states;
  const currentDfaStates = dfa.states;

  // Get current NFA transitions
  const nfaTransitions = nfaInput.transitions.map(t => ({
    from: t.from,
    to: t.to,
    symbol: t.symbol || 'ε'
  }));

  // Get current DFA transitions
  const dfaTransitions = dfa.transitions.map(t => ({
    from: t.fromDfaStateId,
    to: t.toDfaStateId,
    symbol: t.symbol
  }));

  // Get highlighted states for NFA (current processing state)
  const highlightedNfaStates = currentStepBreakdown.length > 0
    ? Array.from(currentStepBreakdown[0]?.nfaStatesForMove || [])
    : [];

  // Get highlighted states for DFA (current state being processed)
  const highlightedDfaStates = dfaStatesToProcess.length > 0
    ? [dfaStatesToProcess[0].id]
    : [];

  // Get highlighted transitions
  const highlightedEdges = currentStepBreakdown.flatMap(step =>
    step.transitionCreated ? [`${step.dfaStateBeingProcessedId}-${step.targetDfaStateId}-${step.symbol}`] : []
  );

  return (
    <div className="space-y-6">
      {/* State Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>NFA State Diagram</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <StateDiagram
              states={nfaInput.states.map(s => ({
                id: s.id,
                isStartState: s.id === nfaInput.startStateId,
                isAcceptState: nfaInput.acceptStateIds.includes(s.id)
              }))}
              transitions={nfaTransitions}
              highlightedStates={highlightedNfaStates}
              title="NFA State Diagram"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DFA State Diagram</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <StateDiagram
              states={dfa.states.map(s => ({
                id: s.id,
                isStartState: s.id === dfa.startStateId,
                isAcceptState: dfa.acceptStateIds.includes(s.id)
              }))}
              transitions={dfaTransitions}
              highlightedStates={highlightedDfaStates}
              highlightedEdges={highlightedEdges}
              title="DFA State Diagram"
            />
          </CardContent>
        </Card>
      </div>
      {/* NFA to DFA Converter Card */}
      <Card>
        <CardHeader>
          <CardTitle>NFA to DFA Converter</CardTitle>
          <CardDescription>Visualize the subset construction algorithm step-by-step to convert an NFA to a DFA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleNextStep} disabled={dfaStatesToProcess.length === 0}>
              Next DFA Construction Step
            </Button>
            <Button onClick={resetDfaConstruction} variant="outline">
              Reset Construction
            </Button>
          </div>
          <div>
            <h3 className="font-semibold mb-2">DFA Construction - Current Step Details:</h3>
            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-sm whitespace-pre-wrap min-h-[60px]">
              {currentStepMessage}
            </pre>
          </div>

          {/* Detailed Step Breakdown Section for NFA to DFA */}
          {currentStepBreakdown.length > 0 && dfaStatesToProcess.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-semibold text-md mb-2">
                Detailed Breakdown for Processing DFA State: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{currentStepBreakdown[0]?.dfaStateBeingProcessedId}</code>
              </h4>
              {currentStepBreakdown.map((detail: NfaToDfaStepDetail, index: number) => (
                <Card key={index} className="p-3 bg-slate-50 dark:bg-slate-800/30">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-sm">Processing Symbol: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{detail.symbol}</code></CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 text-xs space-y-1">
                    <p><strong>1. Move Operation (on NFA states {`{${Array.from(detail.nfaStatesForMove).sort().join(',')}}`}):</strong><br />
                      <code className="block bg-white dark:bg-gray-900 p-1 rounded border dark:border-gray-700">
                        move({`{${Array.from(detail.nfaStatesForMove).sort().join(',')}}`}, '{detail.symbol}') = {`{${Array.from(detail.moveOutputNfaStates).sort().join(',')}}`}
                      </code>
                    </p>
                    <p><strong>2. Epsilon Closure:</strong><br />
                      <code className="block bg-white dark:bg-gray-900 p-1 rounded border dark:border-gray-700">
                        ε-closure({`{${Array.from(detail.epsilonClosureInputNfaStates).sort().join(',')}}`}) = {`{${Array.from(detail.epsilonClosureOutputNfaStates).sort().join(',')}}`}
                      </code>
                    </p>
                    <p>
                      <strong>Resulting DFA State ID:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{detail.targetDfaStateId || "Ø (Empty Set)"}</code>
                      {detail.targetDfaStateId && (
                        <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${detail.isNewDfaState ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300'}`}>
                          {detail.isNewDfaState ? 'New' : 'Existing'}
                        </span>
                      )}
                    </p>
                    {detail.transitionCreated && (
                      <p className="text-green-600 dark:text-green-400">
                        <ArrowRight className="inline h-3 w-3 mr-1" />Transition added: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{detail.dfaStateBeingProcessedId}</code> → <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{detail.targetDfaStateId}</code> on symbol '{detail.symbol}'
                      </p>
                    )}
                    {!detail.transitionCreated && detail.targetDfaStateId === "" && (
                      <p className="text-orange-600 dark:text-orange-400">No transition created (empty resulting set).</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* State Diagrams */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>NFA State Diagram</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <StateDiagram
              states={nfaInput.states.map(s => ({
                id: s.id,
                isStartState: s.id === nfaInput.startStateId,
                isAcceptState: nfaInput.acceptStateIds.includes(s.id)
              }))}
              transitions={nfaTransitions}
              highlightedStates={highlightedNfaStates}
              title="NFA State Diagram"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>DFA State Diagram</CardTitle>
          </CardHeader>
          <CardContent className="h-96">
            <StateDiagram
              states={dfa.states.map(s => ({
                id: s.id,
                isStartState: s.id === dfa.startStateId,
                isAcceptState: dfa.acceptStateIds.includes(s.id)
              }))}
              transitions={dfaTransitions}
              highlightedStates={highlightedDfaStates}
              highlightedEdges={highlightedEdges}
              title="DFA State Diagram"
            />
          </CardContent>
        </Card>
      </div>

      {/* DFA Execution Section */}
      <Card>
        <CardHeader>
          <CardTitle>DFA Execution</CardTitle>
          <CardDescription>Test the constructed DFA with an input string.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-grow space-y-1">
              <Label htmlFor="dfa-exec-input">Input String</Label>
              <Input
                id="dfa-exec-input"
                value={dfaInputForExec}
                onChange={(e) => setDfaInputForExec(e.target.value)}
                placeholder="e.g., aab"
                disabled={dfaStatesToProcess.length > 0} // Disable if DFA not fully constructed
              />
            </div>
            <Button onClick={() => handleRunDfaExecution(true)} disabled={dfaStatesToProcess.length > 0 || isDfaAutoPlaying}>Run All</Button>
            <Button onClick={handleDfaAutoPlay} disabled={dfaStatesToProcess.length > 0 || isDfaAutoPlaying || dfaExecSteps.length > 0 && currentDfaExecStepIdx === dfaExecSteps.length - 1} variant="outline">
              <Play className="h-4 w-4 mr-2" /> Auto Play
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={handleDfaExecPrev} disabled={currentDfaExecStepIdx === 0 || isDfaAutoPlaying || dfaExecSteps.length === 0} variant="outline" size="icon"><StepBack className="h-4 w-4" /></Button>
            <Button onClick={handleDfaExecNext} disabled={currentDfaExecStepIdx >= dfaExecSteps.length - 1 || isDfaAutoPlaying || dfaExecSteps.length === 0} variant="outline" size="icon"><StepForward className="h-4 w-4" /></Button>
            <Button onClick={handleDfaExecReset} disabled={isDfaAutoPlaying || dfaExecSteps.length === 0} variant="outline" size="icon"><ResetIcon className="h-4 w-4" /></Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step: {dfaExecSteps.length > 0 ? currentDfaExecStepIdx + 1 : 0} / {dfaExecSteps.length}
            </span>
          </div>

          {dfaExecSteps.length > 0 && (
            <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800/50">
              <p className="text-sm">
                <strong>Current State:</strong> <code className="bg-blue-100 dark:bg-blue-700/50 px-1 rounded">{dfaExecSteps[currentDfaExecStepIdx].currentStateId}</code>
                {dfa.acceptStateIds.includes(dfaExecSteps[currentDfaExecStepIdx].currentStateId) && <span className="text-xs text-green-600 dark:text-green-400"> (Accept)</span>}
              </p>
              <p className="text-sm">
                <strong>Input: </strong>
                <span className="font-mono">
                  <span className="text-gray-400">{dfaInputForExec.substring(0, dfaInputForExec.length - dfaExecSteps[currentDfaExecStepIdx].remainingInput.length - (dfaExecSteps[currentDfaExecStepIdx].inputSymbol ? 1 : 0))}</span>
                  <span className="text-red-500 underline">{dfaExecSteps[currentDfaExecStepIdx].inputSymbol || ""}</span>
                  <span>{dfaExecSteps[currentDfaExecStepIdx].remainingInput}</span>
                </span>
              </p>
              <p className="text-sm"><strong>Action:</strong> {dfaExecSteps[currentDfaExecStepIdx].actionMessage}</p>
            </div>
          )}
          {dfaExecResult !== "Not Started" && dfaExecResult !== "Running" && (
            <p className={`font-semibold text-lg ${dfaExecResult === "Accepted" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              Result: {dfaExecResult}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Constructed DFA</CardTitle>
        </CardHeader>
        <CardContent>
          <p><strong>States:</strong> {dfa.states.map((s: DfaStateData) => `${s.id}${s.isStartState ? " (Start)" : ""}${s.isAcceptState ? " (Accept)" : ""}`).join(', ')}</p>
          <p><strong>Alphabet:</strong> {dfa.alphabet.join(', ')}</p>
          <p><strong>Start State:</strong> {dfa.startStateId || "N/A"}</p>
          <p><strong>Accept States:</strong> {dfa.acceptStateIds.join(', ') || "None"}</p>
          <h4 className="font-semibold mt-2 mb-1">Transitions:</h4>
          {dfa.transitions.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              <Table>
                <TableHeader><TableRow><TableHead>From</TableHead><TableHead>Symbol</TableHead><TableHead>To</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dfa.transitions.map((t: DfaTransitionData, i: number) => (
                    <TableRow key={i}><TableCell>{t.fromDfaStateId}</TableCell><TableCell>{t.symbol}</TableCell><TableCell>{t.toDfaStateId}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : <p>No transitions defined (DFA may not be fully constructed).</p>}
        </CardContent>
      </Card>
    </div>
  );
}
