import { Dfa, DfaStateData, DfaTransitionData } from './automata-helpers';

export type PairState = { p: string; q: string };
export type MarkedPairs = Map<string, boolean>; // Key: "p,q" (sorted), Value: marked (true) or not (false)

export interface MinimizationStepOutput {
  iteration: number;
  markedPairs: MarkedPairs;
  newlyMarkedThisIteration: PairState[]; 
  reason?: string;
}

export const getPairKey = (s1: string, s2: string): string => {
  return s1 < s2 ? `${s1},${s2}` : `${s2},${s1}`;
};

export interface ParsedDfaResult {
    dfa: Dfa | null;
    error?: string;
}

export const parseDfaJson = (jsonString: string): ParsedDfaResult => {
    try {
      const parsed = JSON.parse(jsonString) as Dfa;
      if (!parsed.states || !parsed.alphabet || !parsed.transitions || !parsed.startStateId || !parsed.acceptStateIds) {
        return { dfa: null, error: "Invalid DFA structure. Missing required fields (states, alphabet, transitions, startStateId, acceptStateIds)." };
      }
      if (parsed.states.length === 0 && parsed.startStateId) { // Allow empty DFA if no start state, but not if start state points to nothing
         return { dfa: null, error: "DFA must have at least one state if startStateId is defined."};
      }
      if (parsed.startStateId && !parsed.states.find(s => s.id === parsed.startStateId)) {
        return { dfa: null, error: "Start state ID not found in states list." };
      }
      for (const id of parsed.acceptStateIds) {
        if (!parsed.states.find(s => s.id === id)) {
          return { dfa: null, error: `Accept state ID '${id}' not found in states list.` };
        }
      }
      for (const t of parsed.transitions) {
        if (!parsed.states.find(s => s.id === t.from)) {
          return { dfa: null, error: `Transition error: from state '${t.from}' not found.` };
        }
        if (!parsed.states.find(s => s.id === t.to)) {
          return { dfa: null, error: `Transition error: to state '${t.to}' not found.` };
        }
        if (!parsed.alphabet.includes(t.symbol)) {
          return { dfa: null, error: `Transition error: symbol '${t.symbol}' not in alphabet.` };
        }
      }
      return { dfa: parsed, error: undefined };
    } catch (e: any) {
      return { dfa: null, error: `Error parsing DFA JSON: ${e.message}` };
    }
};


export const findReachableStates = (dfa: Dfa): Set<string> => {
  if (!dfa.startStateId || !dfa.states.find(s => s.id === dfa.startStateId)) return new Set(); // No start state or start state not in list
  
  const reachable = new Set<string>();
  const queue = [dfa.startStateId];
  reachable.add(dfa.startStateId);

  let head = 0;
  while (head < queue.length) {
    const currentStateId = queue[head++]; // More efficient than shift() for large queues
    dfa.transitions.forEach(t => {
      if (t.from === currentStateId && !reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    });
  }
  return reachable;
};

export const initializePairTable = (
  dfaStates: DfaStateData[], 
  dfa: Dfa
): { marked: MarkedPairs; statePairs: PairState[]; initialMarkingStep: MinimizationStepOutput } => {
  const marked: MarkedPairs = new Map();
  const statePairs: PairState[] = [];
  const newlyMarked: PairState[] = [];

  for (let i = 0; i < dfaStates.length; i++) {
    for (let j = i + 1; j < dfaStates.length; j++) {
      const p = dfaStates[i].id;
      const q = dfaStates[j].id;
      statePairs.push({ p, q });
      const pairKey = getPairKey(p, q);
      
      const isPAccept = dfa.acceptStateIds.includes(p);
      const isQAccept = dfa.acceptStateIds.includes(q);

      if (isPAccept !== isQAccept) {
        marked.set(pairKey, true);
        newlyMarked.push({p,q});
      } else {
        marked.set(pairKey, false);
      }
    }
  }
  const initialMarkingStep: MinimizationStepOutput = {
      iteration: 0,
      markedPairs: new Map(marked), 
      newlyMarkedThisIteration: newlyMarked,
      reason: "Initial marking: (accept, non-accept) pairs."
  };
  return { marked, statePairs, initialMarkingStep };
};

export const performIterativeMarking = (
  dfa: Dfa,
  initialMarked: MarkedPairs,
  allStatePairs: PairState[], 
  reachableDfaStates: DfaStateData[] 
): { finalMarked: MarkedPairs; steps: MinimizationStepOutput[] } => {
  const marked = new Map(initialMarked);
  const steps: MinimizationStepOutput[] = [];
  let iteration = 0;

  let changedInIteration;
  do {
    changedInIteration = false;
    iteration++;
    const newlyMarkedThisIteration: PairState[] = [];
    let reasonForMarkingThisIteration = ""; // Capture one reason per iteration for simplicity

    for(const pair of allStatePairs) { // Iterate using for...of for clarity
      const pairKey = getPairKey(pair.p, pair.q);
      if (!marked.get(pairKey)) { 
        for (const symbol of dfa.alphabet) {
          const pTransition = dfa.transitions.find(t => t.from === pair.p && t.symbol === symbol);
          const qTransition = dfa.transitions.find(t => t.from === pair.q && t.symbol === symbol);

          if (pTransition && qTransition) {
            if (pTransition.to !== qTransition.to) { 
                const nextPairKey = getPairKey(pTransition.to, qTransition.to);
                if (marked.get(nextPairKey) === true) {
                    marked.set(pairKey, true);
                    changedInIteration = true;
                    newlyMarkedThisIteration.push(pair);
                    reasonForMarkingThisIteration = `Marked (${pair.p},${pair.q}) on '${symbol}' because (${pTransition.to},${qTransition.to}) was marked.`;
                    break; 
                }
            }
          } else if (pTransition !== qTransition) { 
            // One has a transition, the other doesn't (or they go to different implicit dead states)
            // This implies they are distinguishable.
            marked.set(pairKey, true);
            changedInIteration = true;
            newlyMarkedThisIteration.push(pair);
            reasonForMarkingThisIteration = `Marked (${pair.p},${pair.q}) on '${symbol}' as one has a transition and the other does not (or leads to implicit dead state).`;
            break;
          }
        }
      }
    }
    if (changedInIteration) { 
        steps.push({ 
            iteration, 
            markedPairs: new Map(marked), 
            newlyMarkedThisIteration, 
            reason: reasonForMarkingThisIteration || `Iteration ${iteration} completed.`
        });
    } else if (iteration === 1 && newlyMarkedThisIteration.length === 0 && steps.length === 0){
        // If first iteration after initial had no changes, still log it
         steps.push({ 
            iteration, 
            markedPairs: new Map(marked), 
            newlyMarkedThisIteration, 
            reason: "No new pairs marked in first transition-based iteration."
        });
    }
  } while (changedInIteration);

  return { finalMarked: marked, steps };
};

export const groupEquivalentStates = (
  dfaStates: DfaStateData[], 
  markedPairs: MarkedPairs
): Set<string>[] => {
  const partitions: Set<string>[] = [];
  const visitedStates = new Set<string>();

  dfaStates.forEach(state => {
    if (!visitedStates.has(state.id)) {
      const newGroup = new Set([state.id]);
      visitedStates.add(state.id);
      dfaStates.forEach(otherState => {
        if (state.id !== otherState.id && !visitedStates.has(otherState.id)) {
          if (markedPairs.get(getPairKey(state.id, otherState.id)) === false) {
            newGroup.add(otherState.id);
            visitedStates.add(otherState.id);
          }
        }
      });
      partitions.push(newGroup);
    }
  });
  return partitions;
};

export const constructMinimizedDfaFromGroups = (
  groups: Set<string>[],
  originalDfa: Dfa,
  originalReachableStates: DfaStateData[] 
): Dfa | null => {
  if (groups.length === 0 && originalDfa.states.length > 0) {
      // This case might happen if all states were equivalent to one another but originalDfa was not empty.
      // Or if originalReachableStates was empty.
      if (originalReachableStates.length === 0 && originalDfa.startStateId) {
          // No reachable states but a start state was defined - implies empty language DFA might be just start state if not accepting
          // or no states if start state itself is not considered reachable (e.g. no transitions from it and it's not accept)
          const startStateIsAccept = originalDfa.acceptStateIds.includes(originalDfa.startStateId!);
          const s0: DfaStateData = {id: "M0", isStartState: true, isAcceptState: startStateIsAccept, nfaStateIds: new Set(originalDfa.startStateId ? [originalDfa.startStateId] : [])};
           return {
               states: [s0],
               alphabet: originalDfa.alphabet,
               transitions: [],
               startStateId: "M0",
               acceptStateIds: startStateIsAccept ? ["M0"] : []
           };
      }
      // if groups is empty but originalReachableStates is not, it's an issue.
      // However, groupEquivalentStates should always produce at least one group if dfaStates is not empty.
  }
  if (groups.length === 0 && originalReachableStates.length === 0) return { ...originalDfa, states: [], transitions: [], startStateId: null, acceptStateIds:[] };


  const minimizedStates: DfaStateData[] = groups.map((group, index) => {
    const representativeId = group.values().next().value; 
    return {
      id: `M${index}`, 
      isStartState: group.has(originalDfa.startStateId!),
      isAcceptState: Array.from(group).some(id => originalDfa.acceptStateIds.includes(id)),
      nfaStateIds: group 
    };
  });

  const minimizedTransitions: DfaTransitionData[] = [];
  groups.forEach((group, groupIndex) => {
    const currentMinimizedStateId = minimizedStates[groupIndex].id;
    const representativeStateId = group.values().next().value; 

    originalDfa.alphabet.forEach(symbol => {
      const originalTransition = originalDfa.transitions.find(
        t => t.from === representativeStateId && t.symbol === symbol
      );
      if (originalTransition) {
        const targetOriginalStateId = originalTransition.to;
        const targetGroupIndex = groups.findIndex(g => g.has(targetOriginalStateId));
        if (targetGroupIndex !== -1) {
          // Avoid duplicate transitions if multiple original states in group map to same target group
          const existingTransition = minimizedTransitions.find(mt => mt.from === currentMinimizedStateId && mt.symbol === symbol);
          if(!existingTransition) {
            minimizedTransitions.push({
              from: currentMinimizedStateId, 
              symbol: symbol,
              to: minimizedStates[targetGroupIndex].id, 
            });
          } else if (existingTransition.to !== minimizedStates[targetGroupIndex].id) {
            // This would indicate an issue with determinism or the grouping, should not happen for DFA.
            console.error("Minimized DFA construction conflict: multiple targets for same from-symbol");
          }
        }
      }
    });
  });
  
  const minDfaStartState = minimizedStates.find(s => s.isStartState);
  const minDfaAcceptStates = minimizedStates.filter(s => s.isAcceptState).map(s => s.id);

  return {
    states: minimizedStates,
    alphabet: originalDfa.alphabet,
    transitions: minimizedTransitions,
    startStateId: minDfaStartState ? minDfaStartState.id : (minimizedStates.length > 0 ? minimizedStates[0].id : null),
    acceptStateIds: minDfaAcceptStates,
  };
};
