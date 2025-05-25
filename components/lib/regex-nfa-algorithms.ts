import { NfaState, NfaTransition, NfaOutput, calculateEpsilonClosure, calculateMove } from './automata-helpers';

// Internal representation for NFA fragments during Thompson's construction
export interface NfaFragment {
  startState: NfaState;
  acceptState: NfaState;
  states: NfaState[];
  transitions: NfaTransition[];
  alphabet: Set<string>;
}

// For NFA execution visualization
export interface NfaExecutionStep {
  step: number;
  currentNfaStateIds: Set<string>; 
  symbolProcessed: string | null;  
  inputSymbol: string | null;      
  remainingInput: string;
  statesAfterMove: Set<string> | null;    
  statesAfterClosure: Set<string> | null; 
  actionMessage: string;
}

let thompsonStateCounter = 0;
export const generateThompsonStateId = (): string => `tq${thompsonStateCounter++}`;
export const resetThompsonStateCounter = () => { thompsonStateCounter = 0; };


export const preprocessRegex = (infix: string): string => {
  let output = "";
  for (let i = 0; i < infix.length; i++) {
    output += infix[i];
    if (i + 1 < infix.length) {
      const char1 = infix[i];
      const char2 = infix[i+1];
      if ((isOperand(char1) || char1 === ')' || char1 === '*') && 
          (isOperand(char2) || char2 === '(') ) {
        output += '.';
      }
    }
  }
  return output;
};

export const getPrecedence = (op: string): number => {
  if (op === '|') return 1;
  if (op === '.') return 2;
  if (op === '*') return 3;
  return 0;
};

// Includes epsilon for parsing, but Thompson handles 'ε' char specifically to mean null transition symbol
export const isOperand = (char: string): boolean => /^[a-zA-Z0-9\u03B5]$/.test(char);


export const infixToPostfix = (infix: string): string => {
  let postfix = "";
  const stack: string[] = [];
  for (const char of infix) {
    if (isOperand(char)) {
      postfix += char;
    } else if (char === '(') {
      stack.push(char);
    } else if (char === ')') {
      while (stack.length > 0 && stack[stack.length - 1] !== '(') postfix += stack.pop();
      if (stack.length === 0) throw new Error("Mismatched parentheses in regex.");
      stack.pop(); 
    } else { 
      while (stack.length > 0 && stack[stack.length - 1] !== '(' && getPrecedence(stack[stack.length - 1]) >= getPrecedence(char)) {
        postfix += stack.pop();
      }
      stack.push(char);
    }
  }
  while (stack.length > 0) {
    if (stack[stack.length - 1] === '(') throw new Error("Mismatched parentheses in regex.");
    postfix += stack.pop();
  }
  return postfix;
};

export const thompsonConstruction = (postfix: string): NfaOutput => {
  const fragmentStack: NfaFragment[] = [];
  const overallAlphabet = new Set<string>();
  resetThompsonStateCounter(); // Ensure fresh state IDs for each construction

  for (const char of postfix) {
    if (isOperand(char)) {
      const s0 = { id: generateThompsonStateId() };
      const s1 = { id: generateThompsonStateId() };
      const actualSymbol = char === 'ε' ? null : char;
      fragmentStack.push({
        startState: s0, acceptState: s1, states: [s0, s1],
        transitions: [{ from: s0.id, to: s1.id, symbol: actualSymbol }],
        alphabet: actualSymbol ? new Set([actualSymbol]) : new Set(),
      });
      if (actualSymbol) overallAlphabet.add(actualSymbol);
    } else if (char === '.') {
      if (fragmentStack.length < 2) throw new Error("Concatenation error: Not enough operands.");
      const nfa2 = fragmentStack.pop()!; const nfa1 = fragmentStack.pop()!;
      
      // Connect nfa1's accept state to nfa2's start state
      // No new states, just new transition and merging states/transitions lists
      // Old nfa1.acceptState is no longer an accept state for the new fragment
      // Old nfa2.startState is no longer a start state for the new fragment
      const combinedStates = [...nfa1.states, ...nfa2.states];
      const combinedTransitions = [
          ...nfa1.transitions, 
          ...nfa2.transitions, 
          { from: nfa1.acceptState.id, to: nfa2.startState.id, symbol: null }
      ];
      
      fragmentStack.push({
        startState: nfa1.startState, acceptState: nfa2.acceptState,
        states: combinedStates,
        transitions: combinedTransitions,
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      });
    } else if (char === '|') {
      if (fragmentStack.length < 2) throw new Error("Union error: Not enough operands.");
      const nfa2 = fragmentStack.pop()!; const nfa1 = fragmentStack.pop()!;
      const start = { id: generateThompsonStateId() }; 
      const accept = { id: generateThompsonStateId() };
      fragmentStack.push({
        startState: start, acceptState: accept,
        states: [start, accept, ...nfa1.states, ...nfa2.states],
        transitions: [
          ...nfa1.transitions, ...nfa2.transitions,
          { from: start.id, to: nfa1.startState.id, symbol: null }, 
          { from: start.id, to: nfa2.startState.id, symbol: null },
          { from: nfa1.acceptState.id, to: accept.id, symbol: null }, 
          { from: nfa2.acceptState.id, to: accept.id, symbol: null },
        ],
        alphabet: new Set([...nfa1.alphabet, ...nfa2.alphabet]),
      });
    } else if (char === '*') {
      if (fragmentStack.length < 1) throw new Error("Kleene star error: Not enough operands.");
      const nfa = fragmentStack.pop()!;
      const start = { id: generateThompsonStateId() }; 
      const accept = { id: generateThompsonStateId() };
      fragmentStack.push({
        startState: start, acceptState: accept,
        states: [start, accept, ...nfa.states],
        transitions: [
          ...nfa.transitions,
          { from: start.id, to: nfa.startState.id, symbol: null }, 
          { from: start.id, to: accept.id, symbol: null }, // Zero occurrences
          { from: nfa.acceptState.id, to: nfa.startState.id, symbol: null }, // Loop back
          { from: nfa.acceptState.id, to: accept.id, symbol: null },
        ],
        alphabet: nfa.alphabet,
      });
    }
  }

  if (fragmentStack.length !== 1) throw new Error("Regex processing failed; stack should end with one NFA fragment.");
  const finalNfaFragment = fragmentStack[0];
  
  const finalStates = finalNfaFragment.states.map(s => ({
      ...s, // Spread existing properties like ID
      isStartState: s.id === finalNfaFragment.startState.id,
      isAcceptState: s.id === finalNfaFragment.acceptState.id,
  }));
  
  // Deduplicate states by ID, ensuring start/accept flags are correctly set on the final unique state objects
  const stateMap = new Map<string, NfaState>();
  finalStates.forEach(s => {
      if (!stateMap.has(s.id)) {
          stateMap.set(s.id, { ...s }); // Store a copy
      } else {
          const existing = stateMap.get(s.id)!;
          if (s.isStartState) existing.isStartState = true;
          if (s.isAcceptState) existing.isAcceptState = true;
      }
  });

  return {
    states: Array.from(stateMap.values()),
    alphabet: Array.from(overallAlphabet).sort(),
    transitions: finalNfaFragment.transitions,
    startStateId: finalNfaFragment.startState.id,
    acceptStateIds: [finalNfaFragment.acceptState.id], // Thompson's construction yields one accept state for the fragment
  };
};


export const executeNfa = (nfa: NfaOutput, input: string): { steps: NfaExecutionStep[], result: "Accepted" | "Rejected" } => {
  const steps: NfaExecutionStep[] = [];
  if (!nfa.startStateId) {
    steps.push({ step:0, currentNfaStateIds: new Set(), symbolProcessed:null, inputSymbol:null, remainingInput:input, statesAfterMove: null, statesAfterClosure: null, actionMessage: "NFA has no start state."});
    return { steps, result: "Rejected" };
  }

  let currentActiveStates = calculateEpsilonClosure(new Set([nfa.startStateId]), nfa);
  let remainingInput = input;
  
  steps.push({
    step: 0, currentNfaStateIds: new Set(currentActiveStates), symbolProcessed: null, inputSymbol: remainingInput[0] || null,
    remainingInput: remainingInput, statesAfterMove: null, statesAfterClosure: new Set(currentActiveStates),
    actionMessage: `Initial state (ε-closure of ${nfa.startStateId}): {${Array.from(currentActiveStates).sort().join(',')}}`
  });

  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const statesAfterMove = calculateMove(currentActiveStates, symbol, nfa);
    const statesAfterClosure = calculateEpsilonClosure(statesAfterMove, nfa);
    
    currentActiveStates = statesAfterClosure;
    remainingInput = input.substring(i + 1);

    steps.push({
      step: i + 1, currentNfaStateIds: new Set(currentActiveStates), symbolProcessed: symbol, inputSymbol: remainingInput[0] || null,
      remainingInput: remainingInput, statesAfterMove: new Set(statesAfterMove), statesAfterClosure: new Set(currentActiveStates),
      actionMessage: `After symbol '${symbol}': move to {${Array.from(statesAfterMove).sort().join(',')}}, then ε-closure to {${Array.from(currentActiveStates).sort().join(',')}}`
    });

    if (currentActiveStates.size === 0) break; 
  }
  
  const accepted = Array.from(currentActiveStates).some(sId => nfa.acceptStateIds.includes(sId));
  const finalMessageAction = `End of input. Final active states: {${Array.from(currentActiveStates).sort().join(',')}}. ${accepted ? "String Accepted." : "String Rejected."}`;
  if (steps.length > 0) {
      steps[steps.length-1].actionMessage = finalMessageAction;
  } else { // Empty input string case
       steps.push({
        step: 0, currentNfaStateIds: new Set(currentActiveStates), symbolProcessed: null, inputSymbol: null,
        remainingInput: "", statesAfterMove: null, statesAfterClosure: new Set(currentActiveStates),
        actionMessage: finalMessageAction
      });
  }
  
  return { steps, result: accepted ? "Accepted" : "Rejected" };
};
