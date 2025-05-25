import {
  NfaState,
  NfaTransition,
  NfaOutput, // Used as the Nfa type
  DfaStateData,
  DfaTransitionData,
  Dfa,
  DfaExecutionStep,
  calculateEpsilonClosure,
  calculateMove,
  executeDfa
} from '../lib/automata-helpers';

// Sample NFA (similar to exampleNfa in NfaToDfaVisualizer)
// Accepts strings ending in "ab"
// q0 --a--> q0
// q0 --a--> q1
// q0 --b--> q0
// q1 --b--> q2 (accept)
const testNfa: NfaOutput = {
  states: [
    { id: "q0", isStartState: true },
    { id: "q1" },
    { id: "q2", isAcceptState: true },
    { id: "q3" } // An isolated state for some tests
  ],
  alphabet: ["a", "b"],
  transitions: [
    { from: "q0", to: "q0", symbol: "a" },
    { from: "q0", to: "q1", symbol: "a" },
    { from: "q0", to: "q0", symbol: "b" },
    { from: "q1", to: "q2", symbol: "b" },
    // Add an epsilon transition for testing closure
    { from: "q1", to: "q3", symbol: null } 
  ],
  startStateId: "q0",
  acceptStateIds: ["q2"],
};

describe('Automata Helper Functions', () => {
  describe('calculateEpsilonClosure', () => {
    it('should return the same set if no epsilon transitions from initial states', () => {
      const closure = calculateEpsilonClosure(new Set(["q0"]), testNfa);
      expect(closure).toEqual(new Set(["q0"]));
    });

    it('should include states reachable by epsilon transitions', () => {
      const closure = calculateEpsilonClosure(new Set(["q1"]), testNfa);
      expect(closure).toEqual(new Set(["q1", "q3"]));
    });

    it('should handle multiple initial states with epsilon transitions', () => {
      const nfaWithMoreEps: NfaOutput = {
        ...testNfa,
        transitions: [
          ...testNfa.transitions,
          { from: "q0", to: "q4", symbol: null },
          { from: "q4", to: "q5", symbol: null }
        ],
        states: [...testNfa.states, {id: "q4"}, {id: "q5"}]
      };
      const closure = calculateEpsilonClosure(new Set(["q0", "q1"]), nfaWithMoreEps);
      expect(closure).toEqual(new Set(["q0", "q1", "q3", "q4", "q5"]));
    });

    it('should return an empty set for an empty input set', () => {
      const closure = calculateEpsilonClosure(new Set<string>(), testNfa);
      expect(closure).toEqual(new Set<string>());
    });
     it('should handle states with no outgoing epsilon transitions correctly', () => {
      const closure = calculateEpsilonClosure(new Set(["q2"]), testNfa);
      expect(closure).toEqual(new Set(["q2"]));
    });
  });

  describe('calculateMove', () => {
    it('should return states reachable on a given symbol', () => {
      const moveStates = calculateMove(new Set(["q0"]), "a", testNfa);
      expect(moveStates).toEqual(new Set(["q0", "q1"]));
    });

    it('should return states reachable from a set of states', () => {
      // With q0 --a--> q0, q0 --a--> q1. If current states are {q0, q1}
      // move({q0,q1}, 'a') -> from q0: {q0,q1}. from q1: {} => result {q0,q1}
      const moveStates = calculateMove(new Set(["q0", "q1"]), "a", testNfa);
      expect(moveStates).toEqual(new Set(["q0", "q1"]));
    });

    it('should return an empty set if no transitions on the symbol', () => {
      const moveStates = calculateMove(new Set(["q2"]), "a", testNfa);
      expect(moveStates).toEqual(new Set<string>());
    });
    
    it('should correctly calculate move for symbol "b"', () => {
      const moveFromQ0 = calculateMove(new Set(["q0"]), "b", testNfa);
      expect(moveFromQ0).toEqual(new Set(["q0"]));
      
      const moveFromQ1 = calculateMove(new Set(["q1"]), "b", testNfa);
      expect(moveFromQ1).toEqual(new Set(["q2"]));

      const moveFromQ0Q1 = calculateMove(new Set(["q0", "q1"]), "b", testNfa);
      expect(moveFromQ0Q1).toEqual(new Set(["q0", "q2"]));
    });
  });

  describe('executeDfa', () => {
    // DFA that accepts strings with an even number of 'a's
    const evenADfa: Dfa = {
      states: [
        { id: "s0", isStartState: true, isAcceptState: true }, // Even 'a's (start)
        { id: "s1", isAcceptState: false }                   // Odd 'a's
      ],
      alphabet: ["a", "b"],
      transitions: [
        { fromDfaStateId: "s0", symbol: "a", toDfaStateId: "s1" },
        { fromDfaStateId: "s0", symbol: "b", toDfaStateId: "s0" },
        { fromDfaStateId: "s1", symbol: "a", toDfaStateId: "s0" },
        { fromDfaStateId: "s1", symbol: "b", toDfaStateId: "s1" },
      ],
      startStateId: "s0",
      acceptStateIds: ["s0"],
    };

    it('should accept "aa"', () => {
      const { result, steps } = executeDfa(evenADfa, "aa");
      expect(result).toBe("Accepted");
      expect(steps[steps.length - 1].actionMessage).toContain("Accepted");
    });

    it('should reject "a"', () => {
      const { result, steps } = executeDfa(evenADfa, "a");
      expect(result).toBe("Rejected");
      expect(steps[steps.length - 1].actionMessage).toContain("Rejected");
    });

    it('should accept "baba"', () => {
      const { result } = executeDfa(evenADfa, "baba");
      expect(result).toBe("Accepted");
    });

    it('should reject "bab"', () => {
      const { result } = executeDfa(evenADfa, "bab");
      expect(result).toBe("Rejected");
    });

    it('should accept empty string ""', () => {
      const { result } = executeDfa(evenADfa, "");
      expect(result).toBe("Accepted");
    });
    
    it('should reject if no transition exists', () => {
        const dfaWithMissingTransition: Dfa = {
            ...evenADfa,
            transitions: [
                 { fromDfaStateId: "s0", symbol: "b", toDfaStateId: "s0" }, // Missing s0,a -> s1
                 { fromDfaStateId: "s1", symbol: "a", toDfaStateId: "s0" },
                 { fromDfaStateId: "s1", symbol: "b", toDfaStateId: "s1" },
            ]
        };
        const { result, steps } = executeDfa(dfaWithMissingTransition, "aa");
        expect(result).toBe("Rejected");
        expect(steps[steps.length - 1].actionMessage).toContain("Error: No transition");
    });

    it('should produce correct execution steps', () => {
        const { steps } = executeDfa(evenADfa, "ab");
        // s0 --a--> s1 --b--> s1
        expect(steps.length).toBe(3); // Initial, after 'a', after 'b'
        expect(steps[0].currentStateId).toBe("s0");
        expect(steps[0].inputSymbol).toBe("a");
        expect(steps[0].actionMessage).toBe("Start at state s0.");
        
        expect(steps[1].currentStateId).toBe("s1");
        expect(steps[1].symbolProcessed).toBe("a");
        expect(steps[1].inputSymbol).toBe("b");
        expect(steps[1].actionMessage).toBe("Processing symbol 'b'..."); // Before final action
        expect(steps[0].nextStateId).toBe("s1"); // Check previous step's nextStateId
        expect(steps[0].actionMessage).toBe("State s0, Input 'a' → Transition to s1");


        expect(steps[2].currentStateId).toBe("s1");
        expect(steps[2].symbolProcessed).toBe("b");
        expect(steps[2].inputSymbol).toBe(null);
        expect(steps[2].actionMessage).toBe("End of input. Final state s1 is not an accept state. Rejected.");
        expect(steps[1].nextStateId).toBe("s1");
        expect(steps[1].actionMessage).toBe("State s1, Input 'b' → Transition to s1");

    });
  });
});
