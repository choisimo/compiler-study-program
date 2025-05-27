import {
  preprocessRegex,
  infixToPostfix,
  thompsonConstruction,
  executeNfa,
  NfaExecutionStep, // Assuming this is exported from regex-nfa-algorithms
  resetThompsonStateCounter
} from '../lib/regex-nfa-algorithms';

import {
  NfaOutput,
  NfaState, // For constructing expected NFA parts
  NfaTransition, // For constructing expected NFA parts
  calculateEpsilonClosure,
  calculateMove
} from '../lib/automata-helpers';

describe('Regex to NFA Algorithms', () => {
  beforeEach(() => {
    resetThompsonStateCounter(); // Reset for consistent state IDs in tests
  });

  describe('preprocessRegex', () => {
    it('should add concatenation for "ab"', () => {
      expect(preprocessRegex("ab")).toBe("a.b");
    });
    it('should add concatenation for "a(bc)"', () => {
      expect(preprocessRegex("a(bc)")).toBe("a.(b.c)");
    });
    it('should handle "a*b"', () => {
      expect(preprocessRegex("a*b")).toBe("a*.b");
    });
    it('should handle "(a|b)c"', () => {
      expect(preprocessRegex("(a|b)c")).toBe("(a|b).c");
    });
    it('should handle "a|b*c"', () => { // a | (b*.c)
      expect(preprocessRegex("a|b*c")).toBe("a|b*.c");
    });
     it('should handle complex cases like "a(b|c)*d"', () => {
      expect(preprocessRegex("a(b|c)*d")).toBe("a.(b|c)*.d");
    });
  });

  describe('infixToPostfix', () => {
    it('should convert "a.b|c" to "ab.c|"', () => {
      expect(infixToPostfix("a.b|c")).toBe("ab.c|");
    });
    it('should convert "a.(b|c)" to "abc|."', () => {
      expect(infixToPostfix("a.(b|c)")).toBe("abc|.");
    });
    it('should convert "a*" to "a*"', () => {
      expect(infixToPostfix("a*")).toBe("a*");
    });
    it('should convert "(a.b)*" to "ab.*"', () => {
      expect(infixToPostfix("(a.b)*")).toBe("ab.*");
    });
     it('should convert "a|b*.c" to "ab*c.|"', () => { // a | ((b*).c)
      expect(infixToPostfix("a|b*.c")).toBe("ab*c.|");
    });
  });

  describe('thompsonConstruction', () => {
    it('should construct NFA for "a"', () => {
      const nfa = thompsonConstruction("a");
      expect(nfa.states.length).toBe(2);
      expect(nfa.transitions.length).toBe(1);
      expect(nfa.transitions[0].symbol).toBe('a');
      expect(nfa.alphabet).toEqual(['a']);
      expect(nfa.startStateId).toBeDefined();
      expect(nfa.acceptStateIds.length).toBe(1);
    });

    it('should construct NFA for "a.b"', () => {
      const nfa = thompsonConstruction("ab."); // Postfix for a.b
      // Expected: s0 --a--> s1 --ε--> s2 --b--> s3
      // Total 4 states, 3 transitions (a, ε, b)
      expect(nfa.states.length).toBe(4); // tq0, tq1, tq2, tq3
      expect(nfa.transitions.length).toBe(3);
      expect(nfa.alphabet).toEqual(['a', 'b']);
      // Further checks:
      // Start state is tq0, accept state is tq3
      // Transition from tq0 on 'a' to tq1
      // Transition from tq1 on null to tq2
      // Transition from tq2 on 'b' to tq3
      const aTrans = nfa.transitions.find(t => t.symbol === 'a');
      const bTrans = nfa.transitions.find(t => t.symbol === 'b');
      const epsTrans = nfa.transitions.find(t => t.symbol === null);
      expect(aTrans).toBeDefined();
      expect(bTrans).toBeDefined();
      expect(epsTrans).toBeDefined();
      expect(epsTrans!.from).toBe(aTrans!.to);
      expect(epsTrans!.to).toBe(bTrans!.from);
    });

    it('should construct NFA for "a|b"', () => {
      const nfa = thompsonConstruction("ab|"); // Postfix for a|b
      // Expected: 2 new states (start, end), 4 original states (2 for a, 2 for b) = 6 states
      // 4 new epsilon transitions, 2 original symbol transitions = 6 transitions
      expect(nfa.states.length).toBe(6);
      expect(nfa.transitions.length).toBe(6); // 2 for a,b paths + 4 epsilons for union
      expect(nfa.alphabet).toEqual(['a', 'b']);
      const symbolTransitions = nfa.transitions.filter(t => t.symbol !== null);
      expect(symbolTransitions.length).toBe(2);
      const epsilonTransitions = nfa.transitions.filter(t => t.symbol === null);
      expect(epsilonTransitions.length).toBe(4);
    });

    it('should construct NFA for "a*"', () => {
      const nfa = thompsonConstruction("a*"); // Postfix for a*
      // Expected: 2 new states (start, end), 2 original states (for a) = 4 states
      // 1 original symbol transition, 4 new epsilon transitions = 5 transitions
      expect(nfa.states.length).toBe(4);
      expect(nfa.transitions.length).toBe(5);
      expect(nfa.alphabet).toEqual(['a']);
    });

    it('should construct NFA for "ε" (epsilon character)', () => {
      const nfa = thompsonConstruction("ε");
      expect(nfa.states.length).toBe(2);
      expect(nfa.transitions.length).toBe(1);
      expect(nfa.transitions[0].symbol).toBe(null); // Epsilon transition
      expect(nfa.alphabet).toEqual([]); // No symbols in alphabet for epsilon
    });
  });

  describe('NFA Execution (using calculateEpsilonClosure and calculateMove)', () => {
    // Test with NFA for "a.b"
    // Postfix: "ab."
    // s0 --a--> s1 --ε--> s2 --b--> s3 (accept)
    // States: tq0(start), tq1, tq2, tq3(accept)
    // Transitions: (tq0,a,tq1), (tq1,null,tq2), (tq2,b,tq3)
    const nfa_ab = thompsonConstruction("ab.");

    it('calculateEpsilonClosure for NFA "ab." from tq0', () => {
        // Epsilon closure of {tq0} should be {tq0} because no direct epsilon from tq0
        const closure = calculateEpsilonClosure(new Set([nfa_ab.startStateId]), nfa_ab);
        expect(closure).toEqual(new Set([nfa_ab.startStateId])); // tq0
    });
    
    it('calculateEpsilonClosure for NFA "ab." from tq1', () => {
        // Epsilon closure of {tq1} should be {tq1, tq2}
        const tq1 = nfa_ab.transitions.find(t => t.symbol === 'a')!.to;
        const tq2 = nfa_ab.transitions.find(t => t.symbol === null)!.to;
        const closure = calculateEpsilonClosure(new Set([tq1]), nfa_ab);
        expect(closure).toEqual(new Set([tq1, tq2]));
    });

    it('calculateMove for NFA "ab." on "a" from {tq0}', () => {
      const closure_tq0 = calculateEpsilonClosure(new Set([nfa_ab.startStateId]), nfa_ab);
      const move_a = calculateMove(closure_tq0, 'a', nfa_ab);
      const tq1 = nfa_ab.transitions.find(t => t.symbol === 'a')!.to;
      expect(move_a).toEqual(new Set([tq1]));
    });

    describe('executeNfa', () => {
      it('should accept "ab" for NFA of "a.b"', () => {
        const { result, steps } = executeNfa(nfa_ab, "ab");
        expect(result).toBe("Accepted");
        expect(steps[steps.length - 1].actionMessage).toContain("Accepted");
      });

      it('should reject "a" for NFA of "a.b"', () => {
        const { result } = executeNfa(nfa_ab, "a");
        expect(result).toBe("Rejected");
      });

      it('should reject "b" for NFA of "a.b"', () => {
        const { result } = executeNfa(nfa_ab, "b");
        expect(result).toBe("Rejected");
      });

      it('should reject "aba" for NFA of "a.b"', () => {
        const { result } = executeNfa(nfa_ab, "aba");
        expect(result).toBe("Rejected");
      });
      
      it('should accept "aa" for NFA of "a*" (postfix "a*")', () => {
        const nfa_astar = thompsonConstruction("a*");
        const { result } = executeNfa(nfa_astar, "aa");
        expect(result).toBe("Accepted");
      });

      it('should accept empty string for NFA of "a*" (postfix "a*")', () => {
        const nfa_astar = thompsonConstruction("a*");
        const { result } = executeNfa(nfa_astar, "");
        expect(result).toBe("Accepted");
      });

      it('should accept "b" for NFA of "a|b" (postfix "ab|")', () => {
        const nfa_aorb = thompsonConstruction("ab|");
        const { result } = executeNfa(nfa_aorb, "b");
        expect(result).toBe("Accepted");
      });
       it('should reject "c" for NFA of "a|b" (postfix "ab|")', () => {
        const nfa_aorb = thompsonConstruction("ab|");
        const { result } = executeNfa(nfa_aorb, "c");
        expect(result).toBe("Rejected");
      });
    });
  });
});
