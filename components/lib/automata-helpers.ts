// --- NFA Data Structures (Shared or defined here) ---
export interface NfaState {
  id: string;
  isStartState?: boolean;
  isAcceptState?: boolean;
}

export interface NfaTransition {
  from: string; // NFA state ID
  to: string;   // NFA state ID
  symbol: string | null; // null for epsilon transitions (ε)
}

// NfaOutput can be used as a generic NFA representation
export interface NfaOutput { 
  states: NfaState[];
  alphabet: string[];
  transitions: NfaTransition[];
  startStateId: string;
  acceptStateIds: string[];
}

export const calculateEpsilonClosure = (nfaStateIds: Set<string>, nfa: NfaOutput): Set<string> => {
  const closure = new Set(nfaStateIds);
  const stack = Array.from(nfaStateIds); 

  while (stack.length > 0) {
    const currentStateId = stack.pop()!;
    nfa.transitions.forEach(transition => {
      if (transition.from === currentStateId && transition.symbol === null) { // Epsilon transition
        if (!closure.has(transition.to)) {
          closure.add(transition.to);
          stack.push(transition.to); 
        }
      }
    });
  }
  return closure;
};

export const calculateMove = (nfaStateIds: Set<string>, symbol: string, nfa: NfaOutput): Set<string> => {
  const reachableStates = new Set<string>();
  nfaStateIds.forEach(stateId => {
    nfa.transitions.forEach(transition => {
      if (transition.from === stateId && transition.symbol === symbol) {
        reachableStates.add(transition.to);
      }
    });
  });
  return reachableStates;
};

// --- DFA Data Structures ---
export interface DfaStateData {
  id: string; 
  nfaStateIds?: Set<string>; 
  isStartState?: boolean;
  isAcceptState?: boolean;
}

export interface DfaTransitionData {
  fromDfaStateId: string; // ID of the source DFA state
  toDfaStateId: string;   // ID of the target DFA state
  symbol: string;
}

export interface Dfa {
  states: DfaStateData[];
  alphabet: string[];
  transitions: DfaTransitionData[];
  startStateId: string | null; // Can be null if DFA is not yet fully constructed or invalid
  acceptStateIds: string[];
}

// --- DFA Execution Step Interface (from NfaToDfaVisualizer) ---
export interface DfaExecutionStep {
  step: number;
  currentStateId: string;
  symbolProcessed: string | null; 
  inputSymbol: string | null; 
  remainingInput: string;
  nextStateId: string | null; 
  actionMessage: string; 
}

export const executeDfa = (
  dfa: Dfa, 
  input: string
): { steps: DfaExecutionStep[], result: "Accepted" | "Rejected" } => {
  const steps: DfaExecutionStep[] = [];
  if (!dfa.startStateId || dfa.states.length === 0) {
    steps.push({
      step: 0, currentStateId: "N/A", symbolProcessed: null, inputSymbol: null,
      remainingInput: input, nextStateId: null, actionMessage: "DFA not constructed or no start state."
    });
    return { steps, result: "Rejected" };
  }

  let currentDfaStateId = dfa.startStateId;
  let remainingInput = input;
  let accepted = false;
  let error = false;

  steps.push({
    step: 0, currentStateId: currentDfaStateId, symbolProcessed: null, inputSymbol: remainingInput[0] || null,
    remainingInput: remainingInput, nextStateId: null, 
    actionMessage: `Start at state ${currentDfaStateId}.`
  });

  for (let i = 0; i < input.length; i++) {
    const currentSymbol = input[i];
    const transition = dfa.transitions.find(
      t => t.fromDfaStateId === currentDfaStateId && t.symbol === currentSymbol
    );

    if (!transition) {
      steps[steps.length-1].actionMessage = `No transition from ${currentDfaStateId} on symbol '${currentSymbol}'. Rejected.`;
      steps.push({
          step: i + 1, currentStateId: currentDfaStateId, symbolProcessed: currentSymbol, inputSymbol: null,
          remainingInput: remainingInput.substring(1), nextStateId: null,
          actionMessage: `Error: No transition. String Rejected.`
      });
      accepted = false;
      error = true;
      break;
    }
    
    steps[steps.length-1].nextStateId = transition.toDfaStateId;
    steps[steps.length-1].actionMessage = `State ${currentDfaStateId}, Input '${currentSymbol}' → Transition to ${transition.toDfaStateId}`;
    
    currentDfaStateId = transition.toDfaStateId;
    remainingInput = input.substring(i + 1);
    
    steps.push({
      step: i + 1, currentStateId: currentDfaStateId, symbolProcessed: currentSymbol, inputSymbol: remainingInput[0] || null,
      remainingInput: remainingInput, nextStateId: null,
      actionMessage: `Processing symbol '${remainingInput[0] || ''}'...`
    });
  }

  if (!error) {
    if (dfa.acceptStateIds.includes(currentDfaStateId)) {
      accepted = true;
      steps[steps.length-1].actionMessage = `End of input. Final state ${currentDfaStateId} is an accept state. Accepted.`;
    } else {
      accepted = false;
      steps[steps.length-1].actionMessage = `End of input. Final state ${currentDfaStateId} is not an accept state. Rejected.`;
    }
  }
  
  return { steps, result: accepted ? "Accepted" : "Rejected" };
};
