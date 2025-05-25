"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Import types from automata-helpers and dfa-minimization-algorithms
import { Dfa, DfaStateData, DfaTransitionData } from './lib/automata-helpers';
import { 
    PairState, 
    MarkedPairs, 
    MinimizationStepOutput,
    getPairKey, // Though getPairKey is exported, it's mainly an internal helper for the lib
    parseDfaJson, // Import the newly extracted JSON parser
    findReachableStates,
    initializePairTable,
    performIterativeMarking,
    groupEquivalentStates,
    constructMinimizedDfaFromGroups
} from './lib/dfa-minimization-algorithms';

const defaultDfaJson = `{
  "states": [
    {"id": "A", "isStartState": true}, {"id": "B"}, {"id": "C", "isAcceptState": true},
    {"id": "D"}, {"id": "E", "isAcceptState": true}, {"id": "F"}, {"id": "G", "isAcceptState": true}, {"id": "H"}
  ],
  "alphabet": ["0", "1"],
  "transitions": [
    {"from": "A", "symbol": "0", "to": "B"}, {"from": "A", "symbol": "1", "to": "F"},
    {"from": "B", "symbol": "0", "to": "G"}, {"from": "B", "symbol": "1", "to": "C"},
    {"from": "C", "symbol": "0", "to": "A"}, {"from": "C", "symbol": "1", "to": "C"},
    {"from": "D", "symbol": "0", "to": "C"}, {"from": "D", "symbol": "1", "to": "G"},
    {"from": "E", "symbol": "0", "to": "H"}, {"from": "E", "symbol": "1", "to": "F"},
    {"from": "F", "symbol": "0", "to": "C"}, {"from": "F", "symbol": "1", "to": "G"},
    {"from": "G", "symbol": "0", "to": "G"}, {"from": "G", "symbol": "1", "to": "E"},
    {"from": "H", "symbol": "0", "to": "G"}, {"from": "H", "symbol": "1", "to": "C"}
  ],
  "startStateId": "A",
  "acceptStateIds": ["C", "E", "G"]
}`;


export default function DfaMinimizationVisualizer() {
  const [dfaInputString, setDfaInputString] = useState<string>(defaultDfaJson);
  const [originalDfa, setOriginalDfa] = useState<Dfa | null>(null);
  const [minimizedDfa, setMinimizedDfa] = useState<Dfa | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [minimizationStepsLog, setMinimizationStepsLog] = useState<MinimizationStepOutput[]>([]); // Renamed for clarity
  const [equivalentStateGroups, setEquivalentStateGroups] = useState<Set<string>[]>([]);

  // parseDfaInput is now imported from dfa-minimization-algorithms.ts
  // The component will call parseDfaJson and then use setErrorMessage for UI.

  const handleMinimizeDfa = () => {
    setErrorMessage(null);
    setMinimizedDfa(null);
    setMinimizationStepsLog([]);
    setEquivalentStateGroups([]);
    
    const parseResult = parseDfaJson(dfaInputString);
    if (parseResult.error || !parseResult.dfa) {
        setErrorMessage(parseResult.error || "Failed to parse DFA input.");
        setOriginalDfa(null);
        return;
    }
    const currentParsedDfa = parseResult.dfa;
    setOriginalDfa(currentParsedDfa);

    try {
        // 1. Find Reachable States
        const reachableStateIds = findReachableStates(currentParsedDfa);
        const actualReachableStates = currentParsedDfa.states.filter(s => reachableStateIds.has(s.id));

        if (actualReachableStates.length <= 1) {
            setErrorMessage("DFA has 1 or 0 reachable states, no minimization needed/possible beyond removing unreachable states.");
            // Construct a "minimized" DFA with only reachable states if different from original
            const reachableDfa: Dfa = {
                ...currentParsedDfa,
                states: actualReachableStates,
                // Filter transitions to only include those between reachable states
                transitions: currentParsedDfa.transitions.filter(t => reachableStateIds.has(t.from) && reachableStateIds.has(t.to)),
                acceptStateIds: currentParsedDfa.acceptStateIds.filter(id => reachableStateIds.has(id)),
                startStateId: reachableStateIds.has(currentParsedDfa.startStateId) ? currentParsedDfa.startStateId : (actualReachableStates.length > 0 ? actualReachableStates[0].id : "")
            };
            setMinimizedDfa(reachableDfa);
            return;
        }
        
        // 2. Initialize Pair Table
        const { marked: initialMarked, statePairs, initialMarkingStep } = initializePairTable(actualReachableStates, currentParsedDfa);
        let allSteps: MinimizationStepOutput[] = [initialMarkingStep];

        // 3. Iterative Marking
        const { finalMarked, steps: iterativeSteps } = performIterativeMarking(currentParsedDfa, initialMarked, statePairs, actualReachableStates);
        allSteps = [...allSteps, ...iterativeSteps];
        setMinimizationStepsLog(allSteps);

        // 4. Group Equivalent States
        const eqGroups = groupEquivalentStates(actualReachableStates, finalMarked);
        setEquivalentStateGroups(eqGroups);

        // 5. Construct Minimized DFA
        const finalMinimizedDfa = constructMinimizedDfaFromGroups(eqGroups, currentParsedDfa, actualReachableStates);
        if (finalMinimizedDfa) {
            setMinimizedDfa(finalMinimizedDfa);
        } else {
            setErrorMessage("Failed to construct minimized DFA.");
        }

    } catch (e: any) {
        setErrorMessage(`Error during minimization: ${e.message}`);
        console.error("Minimization error:", e);
    }
  };
  
  useEffect(() => {
    const parseResult = parseDfaJson(dfaInputString);
    if (parseResult.dfa) {
      setOriginalDfa(parseResult.dfa);
      setErrorMessage(null); // Clear previous parse errors if successful
    } else {
      setOriginalDfa(null);
      // Optionally set error message here too, or let handleMinimizeDfa handle it
      // setErrorMessage(parseResult.error || "Invalid DFA JSON for initial display.");
    }
    // Reset minimization results when input changes
    setMinimizedDfa(null);
    setMinimizationStepsLog([]);
    setEquivalentStateGroups([]);
  }, [dfaInputString]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>DFA Minimization Visualizer (Table-Filling)</CardTitle>
        <CardDescription>Input a DFA in JSON format to minimize it using the table-filling algorithm.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="dfa-input">DFA Definition (JSON)</Label>
          <Textarea
            id="dfa-input"
            value={dfaInputString}
            onChange={(e) => setDfaInputString(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            placeholder="Enter DFA JSON here..."
          />
        </div>
        <Button onClick={handleMinimizeDfa}>Minimize DFA</Button>

        {errorMessage && (
          <p className="text-red-500 bg-red-100 p-3 rounded-md">{errorMessage}</p>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Original DFA</CardTitle></CardHeader>
            <CardContent>
              {originalDfa ? (
                <div>
                  <p><strong>Alphabet:</strong> {`{${originalDfa.alphabet.join(', ')}}`}</p>
                  <p><strong>States:</strong> {`{${originalDfa.states.map(s => s.id).join(', ')}}`}</p>
                  <p><strong>Start State:</strong> {originalDfa.startStateId}</p>
                  <p><strong>Accept States:</strong> {`{${originalDfa.acceptStateIds.join(', ')}}`}</p>
                  <h4 className="font-semibold mt-2">Transitions:</h4>
                  <ul className="text-sm max-h-48 overflow-y-auto">
                    {originalDfa.transitions.map((t, i) => <li key={i}>{`δ(${t.from}, ${t.symbol}) = ${t.to}`}</li>)}
                  </ul>
                </div>
              ) : <p>Enter a valid DFA definition to see details.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Minimized DFA</CardTitle></CardHeader>
            <CardContent>
              {minimizedDfa ? (
                <div>
                  <p><strong>Alphabet:</strong> {`{${minimizedDfa.alphabet.join(', ')}}`}</p>
                  <p><strong>States:</strong> {`{${minimizedDfa.states.map(s => s.id).join(', ')}}`}</p>
                  <p><strong>Start State:</strong> {minimizedDfa.startStateId}</p>
                  <p><strong>Accept States:</strong> {`{${minimizedDfa.acceptStateIds.join(', ')}}`}</p>
                  <h4 className="font-semibold mt-2">Transitions:</h4>
                  <ul className="text-sm max-h-48 overflow-y-auto">
                    {minimizedDfa.transitions.map((t, i) => <li key={i}>{`δ(${t.from}, ${t.symbol}) = ${t.to}`}</li>)}
                  </ul>
                </div>
              ) : <p>Minimized DFA will be shown here.</p>}
            </CardContent>
          </Card>
        </div>
        
        {minimizationSteps.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Minimization Steps (Table-Filling)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {minimizationSteps.map((step, index) => (
                <div key={index} className="p-3 border rounded-md bg-gray-50">
                  <h4 className="font-semibold">Iteration {step.iteration}</h4>
                  {step.reason && <p className="text-sm text-gray-600 mb-1">{step.reason}</p>}
                  {step.newlyMarked.length > 0 && (
                    <p className="text-sm mb-1">Newly Marked: {step.newlyMarked.map(p => `(${p.p},${p.q})`).join(', ')}</p>
                  )}
                   <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          {originalDfa?.states.slice(0, -1).map(s => <TableHead key={s.id} className="text-center">{s.id}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {originalDfa?.states.slice(1).map((rowState, rowIndex) => (
                          <TableRow key={rowState.id}>
                            <TableCell className="font-semibold">{rowState.id}</TableCell>
                            {originalDfa?.states.slice(0, rowIndex + 1).map(colState => (
                              <TableCell key={colState.id} className="text-center">
                                {rowState.id !== colState.id ? (step.markedPairs.get(getPairKey(rowState.id, colState.id)) ? 'X' : '-') : ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
         {equivalentStateGroups.length > 0 && (
          <Card>
            <CardHeader><CardTitle  className="text-lg">Equivalent State Groups</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc pl-5">
                {equivalentStateGroups.map((group, i) => (
                  <li key={i}>{`{${Array.from(group).sort().join(', ')}}`}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

      </CardContent>
    </Card>
  );
}
