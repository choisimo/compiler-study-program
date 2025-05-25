import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight } from 'lucide-react';

// --- Data Structures ---
interface NfaState {
  id: string;
  isStartState?: boolean;
  isAcceptState?: boolean;
}

interface NfaTransition {
  from: string; // NFA state ID
  to: string;   // NFA state ID
  symbol: string | null; // null for epsilon transitions
}

interface Nfa {
  states: NfaState[];
  alphabet: string[];
  transitions: NfaTransition[];
  startStateId: string;
  acceptStateIds: string[];
}

// A DFA state is a set of NFA state IDs
interface DfaStateData {
  id: string; // e.g., "{q0,q1}"
  nfaStateIds: Set<string>;
  isStartState?: boolean;
  isAcceptState?: boolean;
}

interface DfaTransitionData {
  fromDfaStateId: string;
  toDfaStateId: string;
  symbol: string;
}

interface Dfa {
  states: DfaStateData[];
  alphabet: string[];
  transitions: DfaTransitionData[];
  startStateId: string | null;
  acceptStateIds: string[];
}

// Interface for detailed step breakdown
interface StepDetail {
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

// --- Helper Functions (Placeholders) ---
const calculateEpsilonClosure = (nfaStateIds: Set<string>, nfa: Nfa): Set<string> => {
  // TODO: Implement epsilon closure logic
  const closure = new Set(nfaStateIds);
  // For now, just return the input states, assuming no epsilon transitions in the example
  // or that they are handled directly if present.
  // A real implementation needs to traverse epsilon transitions.
  let newStatesAdded = true;
  while (newStatesAdded) {
    newStatesAdded = false;
    closure.forEach(stateId => {
      nfa.transitions.forEach(t => {
        if (t.from === stateId && t.symbol === null && !closure.has(t.to)) {
          closure.add(t.to);
          newStatesAdded = true;
        }
      });
    });
  }
  return closure;
};

const calculateMove = (nfaStateIds: Set<string>, symbol: string, nfa: Nfa): Set<string> => {
  // TODO: Implement move logic
  const reachableStates = new Set<string>();
  nfaStateIds.forEach(stateId => {
    nfa.transitions.forEach(t => {
      if (t.from === stateId && t.symbol === symbol) {
        reachableStates.add(t.to);
      }
    });
  });
  return reachableStates;
};

export default function NfaToDfaVisualizer() {
  const [nfa, setNfa] = useState<Nfa>(exampleNfa);
  const [dfa, setDfa] = useState<Dfa>({
    states: [],
    alphabet: exampleNfa.alphabet,
    transitions: [],
    startStateId: null,
    acceptStateIds: [],
  });
  const [currentStepMessage, setCurrentStepMessage] = useState<string>("NFA to DFA conversion initialized.");
  const [dfaStatesProcessed, setDfaStatesProcessed] = useState<DfaStateData[]>([]);
  const [dfaStatesToProcess, setDfaStatesToProcess] = useState<DfaStateData[]>([]);
  const [currentStepBreakdown, setCurrentStepBreakdown] = useState<StepDetail[]>([]);

  useEffect(() => {
    // Initialize the DFA construction process
    const initialNfaStartStateSet = new Set([nfa.startStateId]);
    const initialDfaStartStateNfaIds = calculateEpsilonClosure(initialNfaStartStateSet, nfa);
    const initialDfaStartStateId = `{${Array.from(initialDfaStartStateNfaIds).sort().join(',')}}`;
    
    const initialDfaState: DfaStateData = {
      id: initialDfaStartStateId,
      nfaStateIds: initialDfaStartStateNfaIds,
      isStartState: true,
      isAcceptState: Array.from(initialDfaStartStateNfaIds).some(id => nfa.acceptStateIds.includes(id))
    };

    setDfa(prevDfa => ({
      ...prevDfa,
      states: [initialDfaState],
      startStateId: initialDfaState.id,
      acceptStateIds: initialDfaState.isAcceptState ? [initialDfaState.id] : []
    }));
    setDfaStatesToProcess([initialDfaState]);
    setCurrentStepMessage(`Initial DFA state ${initialDfaState.id} (from NFA states {${Array.from(initialDfaStartStateNfaIds).sort().join(',')}}) created and added to processing queue.`);
    setCurrentStepBreakdown([]); // Clear breakdown on init/reset
  }, [nfa]); // Assuming nfa might change in the future, e.g. user input

  const handleNextStep = () => {
    if (dfaStatesToProcess.length === 0) {
      setCurrentStepMessage("DFA construction complete. No more states to process.");
      setCurrentStepBreakdown([]);
      return;
    }

    const currentDfaStateToProcess = dfaStatesToProcess[0];
    let newDfaStatesCreatedThisStep: DfaStateData[] = []; // Re-declare
    let newDfaTransitionsCreatedThisStep: DfaTransitionData[] = []; // Re-declare
    const stepMessages: string[] = [];
    const localStepBreakdown: StepDetail[] = [];

    stepMessages.push(`Processing DFA State: ${currentDfaStateToProcess.id} (NFA states: {${Array.from(currentDfaStateToProcess.nfaStateIds).sort().join(',')}})`);

    dfa.alphabet.forEach(symbol => {
      stepMessages.push(`  For symbol '${symbol}':`);
      const moveResultNfaIds = calculateMove(currentDfaStateToProcess.nfaStateIds, symbol, nfa);
      stepMessages.push(`    move({${Array.from(currentDfaStateToProcess.nfaStateIds).sort().join(',')}}, ${symbol}) = {${Array.from(moveResultNfaIds).sort().join(',')}}`);

      const targetNfaStateIds = calculateEpsilonClosure(moveResultNfaIds, nfa);
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
        if (!existingDfaState) {
          const newDfaState: DfaStateData = {
            id: targetDfaStateId,
            nfaStateIds: targetNfaStateIds,
            isAcceptState: Array.from(targetNfaStateIds).some(id => nfa.acceptStateIds.includes(id))
          };
          existingDfaState = newDfaState;
          isNewDfa = true;
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
        nfaStatesForMove: currentDfaStateToProcess.nfaStateIds,
        moveOutputNfaStates: moveResultNfaIds,
        epsilonClosureInputNfaStates: moveResultNfaIds, // Input to epsilon closure is output of move
        epsilonClosureOutputNfaStates: targetNfaStateIds,
        targetDfaStateId: targetDfaStateId, // Can be empty if no states reached
        isNewDfaState: isNewDfa,
        transitionCreated: transitionAdded
      });
    });

    setDfa(prevDfa => ({
      ...prevDfa,
      states: [...prevDfa.states, ...newDfaStatesCreatedThisStep],
      transitions: [...prevDfa.transitions, ...newDfaTransitionsCreatedThisStep],
      acceptStateIds: [
        ...prevDfa.acceptStateIds,
        ...newDfaStatesCreatedThisStep.filter((s: DfaStateData) => s.isAcceptState).map((s: DfaStateData) => s.id)
      ].filter((value, index, self) => self.indexOf(value) === index) // Unique IDs
    }));
    
    setDfaStatesProcessed(prev => [...prev, currentDfaStateToProcess]);
    setDfaStatesToProcess(prev => [...prev.slice(1), ...newDfaStatesCreatedThisStep]);
    setCurrentStepMessage(stepMessages.join('\n'));
    setCurrentStepBreakdown(localStepBreakdown);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>NFA to DFA Converter</CardTitle>
          <CardDescription>Visualize the subset construction algorithm step-by-step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleNextStep} disabled={dfaStatesToProcess.length === 0}>
            Next Step
          </Button>
          <div>
            <h3 className="font-semibold mb-2">Current Step Details:</h3>
            <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap">
              {currentStepMessage}
            </pre>
          </div>

          {/* Detailed Step Breakdown Section */}
          {currentStepBreakdown.length > 0 && (
            <div className="mt-4 space-y-3">
              <h4 className="font-semibold text-md mb-2">
                Detailed Breakdown for Processing State: <code className="bg-gray-200 px-1 rounded">{currentStepBreakdown[0]?.dfaStateBeingProcessedId}</code>
              </h4>
              {currentStepBreakdown.map((detail: StepDetail, index: number) => (
                <Card key={index} className="p-4 bg-slate-50">
                  <CardHeader className="p-0 pb-2">
                    <CardTitle className="text-base">Processing Symbol: <code className="bg-gray-200 px-1 rounded">{detail.symbol}</code></CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 text-sm space-y-1">
                    <p><strong>1. Move Operation:</strong><br/>
                      <code className="block bg-white p-1 rounded border">
                        move({`{${Array.from(detail.nfaStatesForMove).sort().join(',')}}`}, '{detail.symbol}') = {`{${Array.from(detail.moveOutputNfaStates).sort().join(',')}}`}
                      </code>
                    </p>
                    <p><strong>2. Epsilon Closure:</strong><br/>
                      <code className="block bg-white p-1 rounded border">
                        ε-closure({`{${Array.from(detail.epsilonClosureInputNfaStates).sort().join(',')}}`}) = {`{${Array.from(detail.epsilonClosureOutputNfaStates).sort().join(',')}}`}
                      </code>
                    </p>
                    <p>
                      <strong>Resulting DFA State:</strong> <code className="bg-gray-200 px-1 rounded">{detail.targetDfaStateId || "Ø (Empty Set)"}</code>
                      {detail.targetDfaStateId && (
                        <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${detail.isNewDfaState ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {detail.isNewDfaState ? 'New' : 'Existing'}
                        </span>
                      )}
                    </p>
                    {detail.transitionCreated && (
                      <p className="text-green-600">
                        <ArrowRight className="inline h-4 w-4 mr-1" />Transition added: <code className="bg-gray-200 px-1 rounded">{detail.dfaStateBeingProcessedId}</code> → <code className="bg-gray-200 px-1 rounded">{detail.targetDfaStateId}</code> on symbol '{detail.symbol}'
                      </p>
                    )}
                    {!detail.transitionCreated && detail.targetDfaStateId === "" && (
                       <p className="text-orange-600">No transition created (empty resulting set).</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>NFA Definition</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>States:</strong> {nfa.states.map((s: NfaState) => s.id).join(', ')}</p>
            <p><strong>Alphabet:</strong> {nfa.alphabet.join(', ')}</p>
            <p><strong>Start State:</strong> {nfa.startStateId}</p>
            <p><strong>Accept States:</strong> {nfa.acceptStateIds.join(', ')}</p>
            <h4 className="font-semibold mt-2 mb-1">Transitions:</h4>
            <ul>
              {nfa.transitions.map((t: NfaTransition, i: number) => (
                <li key={i}>{`δ(${t.from}, ${t.symbol === null ? 'ε' : t.symbol}) = {${t.to}}`}</li>
              ))}
            </ul>
            {/* TODO: Add NFA graph visualization */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Constructed DFA</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>States:</strong> {dfa.states.map((s: DfaStateData) => `${s.id}${s.isStartState ? " (Start)" : ""}${s.isAcceptState ? " (Accept)" : ""}`).join(', ')}</p>
            <p><strong>Alphabet:</strong> {dfa.alphabet.join(', ')}</p>
            <p><strong>Start State:</strong> {dfa.startStateId}</p>
            <p><strong>Accept States:</strong> {dfa.acceptStateIds.join(', ')}</p>
            <h4 className="font-semibold mt-2 mb-1">Transitions:</h4>
            {dfa.transitions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From State</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>To State</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dfa.transitions.map((t: DfaTransitionData, i: number) => (
                    <TableRow key={i}>
                      <TableCell>{t.fromDfaStateId}</TableCell>
                      <TableCell>{t.symbol}</TableCell>
                      <TableCell>{t.toDfaStateId}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <p>No transitions yet.</p>}
            {/* TODO: Add DFA graph visualization */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
