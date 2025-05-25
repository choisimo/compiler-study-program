import {
  NfaOutput as Nfa, // Using NfaOutput as the Nfa type for this component
  DfaStateData,
  DfaTransitionData,
  calculateEpsilonClosure, // Will be used implicitly by the tested function, but good to have for setup
  calculateMove
} from '../lib/automata-helpers';
import {
  processDfaStateInSubsetConstruction,
  NfaToDfaStepDetail
} from '../lib/nfa-to-dfa-algorithms';

// NFA from NfaToDfaVisualizer: accepts strings ending in "ab"
// q0 --a--> q0
// q0 --a--> q1
// q0 --b--> q0
// q1 --b--> q2 (accept)
const testNfa: Nfa = {
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

describe('NFA to DFA Algorithms', () => {
  describe('processDfaStateInSubsetConstruction', () => {
    it('should process the initial DFA state (from NFA start state)', () => {
      // Initial DFA state: EpsilonClosure({q0}) = {q0}
      const initialDfaState: DfaStateData = {
        id: "{q0}",
        nfaStateIds: new Set(["q0"]),
        isStartState: true,
        isAcceptState: false,
      };
      
      // No other known DFA states initially
      const result = processDfaStateInSubsetConstruction(
        initialDfaState,
        testNfa,
        testNfa.alphabet,
        [initialDfaState], // allKnownDfaStates initially only contains the start state itself
        testNfa.acceptStateIds
      );

      // For symbol 'a':
      // move({q0}, a) = {q0, q1}
      // EpsilonClosure({q0, q1}) = {q0, q1} -> New DFA state {q0,q1}
      const detail_a = result.stepDetailsForSymbol.find(d => d.symbol === 'a');
      expect(detail_a).toBeDefined();
      expect(detail_a!.moveOutputNfaStates).toEqual(new Set(["q0", "q1"]));
      expect(detail_a!.epsilonClosureOutputNfaStates).toEqual(new Set(["q0", "q1"]));
      expect(detail_a!.targetDfaStateId).toBe("{q0,q1}");
      expect(detail_a!.isNewDfaState).toBe(true); // Assuming {q0,q1} is new relative to [initialDfaState]
      expect(result.newDfaStatesCreated.find(s => s.id === "{q0,q1}")).toBeDefined();
      expect(result.newDfaTransitions.find(t => t.fromDfaStateId === "{q0}" && t.symbol === "a" && t.toDfaStateId === "{q0,q1}")).toBeDefined();

      // For symbol 'b':
      // move({q0}, b) = {q0}
      // EpsilonClosure({q0}) = {q0} -> Existing DFA state {q0}
      const detail_b = result.stepDetailsForSymbol.find(d => d.symbol === 'b');
      expect(detail_b).toBeDefined();
      expect(detail_b!.moveOutputNfaStates).toEqual(new Set(["q0"]));
      expect(detail_b!.epsilonClosureOutputNfaStates).toEqual(new Set(["q0"]));
      expect(detail_b!.targetDfaStateId).toBe("{q0}");
      // isNewDfaState should be false because {q0} is in `allKnownDfaStates`
      expect(detail_b!.isNewDfaState).toBe(false); 
      expect(result.newDfaStatesCreated.find(s => s.id === "{q0}")).toBeUndefined(); // Not re-created
      expect(result.newDfaTransitions.find(t => t.fromDfaStateId === "{q0}" && t.symbol === "b" && t.toDfaStateId === "{q0}")).toBeDefined();
    });

    it('should process a DFA state leading to new and existing target DFA states', () => {
      // Assume we are processing DFA state D1 = {q0,q1}
      // And DFA state D0 = {q0} already exists.
      const dfaStateD1: DfaStateData = {
        id: "{q0,q1}",
        nfaStateIds: new Set(["q0", "q1"]),
        isAcceptState: false, // q1 is not accept
      };
      const dfaStateD0: DfaStateData = { id: "{q0}", nfaStateIds: new Set(["q0"]), isStartState: true };
      
      const allKnownStates = [dfaStateD0, dfaStateD1]; // D1 is being processed, D0 is known

      const result = processDfaStateInSubsetConstruction(
        dfaStateD1,
        testNfa,
        testNfa.alphabet,
        allKnownStates,
        testNfa.acceptStateIds
      );

      // For symbol 'a' from D1={q0,q1}:
      // move({q0,q1}, a) = move({q0},a) U move({q1},a) = {q0,q1} U {} = {q0,q1}
      // EpsilonClosure({q0,q1}) = {q0,q1} -> Existing state D1 itself
      const detail_a = result.stepDetailsForSymbol.find(d => d.symbol === 'a');
      expect(detail_a!.targetDfaStateId).toBe("{q0,q1}");
      expect(detail_a!.isNewDfaState).toBe(false);
      expect(result.newDfaStatesCreated.find(s => s.id === "{q0,q1}")).toBeUndefined();
      expect(result.newDfaTransitions.find(t => t.fromDfaStateId === "{q0,q1}" && t.symbol === "a" && t.toDfaStateId === "{q0,q1}")).toBeDefined();

      // For symbol 'b' from D1={q0,q1}:
      // move({q0,q1}, b) = move({q0},b) U move({q1},b) = {q0} U {q2} = {q0,q2}
      // EpsilonClosure({q0,q2}) = {q0,q2} -> New DFA state D2={q0,q2} (accepting because q2 is accept)
      const detail_b = result.stepDetailsForSymbol.find(d => d.symbol === 'b');
      expect(detail_b!.targetDfaStateId).toBe("{q0,q2}");
      expect(detail_b!.isNewDfaState).toBe(true);
      const newStateD2 = result.newDfaStatesCreated.find(s => s.id === "{q0,q2}");
      expect(newStateD2).toBeDefined();
      expect(newStateD2!.isAcceptState).toBe(true);
      expect(result.newDfaTransitions.find(t => t.fromDfaStateId === "{q0,q1}" && t.symbol === "b" && t.toDfaStateId === "{q0,q2}")).toBeDefined();
    });

    it('should handle a case leading to an empty set for a symbol', () => {
        // NFA: q0 --a--> q1.  Processing state {q1}
        const simpleNfa: Nfa = {
            states: [{id: "q0", isStartState: true}, {id: "q1"}],
            alphabet: ["a"],
            transitions: [{from: "q0", to: "q1", symbol: "a"}],
            startStateId: "q0",
            acceptStateIds: ["q1"]
        };
        const dfaStateQ1Set: DfaStateData = { id: "{q1}", nfaStateIds: new Set(["q1"]) };
        const result = processDfaStateInSubsetConstruction(
            dfaStateQ1Set, simpleNfa, simpleNfa.alphabet, [dfaStateQ1Set], simpleNfa.acceptStateIds
        );
        const detail_a = result.stepDetailsForSymbol.find(d => d.symbol === 'a');
        expect(detail_a!.moveOutputNfaStates).toEqual(new Set());
        expect(detail_a!.epsilonClosureOutputNfaStates).toEqual(new Set());
        expect(detail_a!.targetDfaStateId).toBe(""); // Empty target
        expect(detail_a!.isNewDfaState).toBe(false);
        expect(detail_a!.transitionCreated).toBe(false);
        expect(result.newDfaStatesCreated.length).toBe(0);
        expect(result.newDfaTransitions.length).toBe(0);
    });
  });
});
