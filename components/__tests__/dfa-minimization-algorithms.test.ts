import {
  Dfa,
  DfaStateData,
  DfaTransitionData
} from '../lib/automata-helpers';
import {
  findReachableStates,
  initializePairTable,
  performIterativeMarking,
  groupEquivalentStates,
  constructMinimizedDfaFromGroups,
  getPairKey, 
  MinimizationStepOutput,
  MarkedPairs,
  PairState,
  parseDfaJson // Added for testing
} from '../lib/dfa-minimization-algorithms';

// Default DFA from DfaMinimizationVisualizer for testing
const testDfa1Json = `{
  "states": [
    {"id": "A", "isStartState": true}, {"id": "B"}, {"id": "C", "isAcceptState": true},
    {"id": "D"}, {"id": "E", "isAcceptState": true}, {"id": "F"}, 
    {"id": "G", "isAcceptState": true}, {"id": "H"}
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
const testDfa1 = JSON.parse(testDfa1Json) as Dfa;


const testDfa2Json = `{
    "states": [
        {"id": "A", "isStartState": true}, {"id": "B"}, {"id": "C"}, {"id": "D"}, {"id": "E", "isAcceptState": true}
    ],
    "alphabet": ["0", "1"],
    "transitions": [
        {"from": "A", "symbol": "0", "to": "B"}, {"from": "A", "symbol": "1", "to": "C"},
        {"from": "B", "symbol": "0", "to": "B"}, {"from": "B", "symbol": "1", "to": "D"},
        {"from": "C", "symbol": "0", "to": "B"}, {"from": "C", "symbol": "1", "to": "C"},
        {"from": "D", "symbol": "0", "to": "B"}, {"from": "D", "symbol": "1", "to": "E"},
        {"from": "E", "symbol": "0", "to": "B"}, {"from": "E", "symbol": "1", "to": "C"}
    ],
    "startStateId": "A",
    "acceptStateIds": ["E"]
}`;
const testDfa2 = JSON.parse(testDfa2Json) as Dfa;


describe('DFA Minimization Algorithms', () => {
  describe('parseDfaJson', () => {
    it('should parse a valid DFA JSON string', () => {
      const { dfa, error } = parseDfaJson(testDfa1Json);
      expect(error).toBeUndefined();
      expect(dfa).toBeDefined();
      expect(dfa?.states.length).toBe(8);
      expect(dfa?.alphabet).toEqual(["0", "1"]);
      expect(dfa?.startStateId).toBe("A");
    });

    it('should return an error for invalid JSON syntax', () => {
      const { dfa, error } = parseDfaJson(`{"states": [}`); // Malformed JSON
      expect(dfa).toBeNull();
      expect(error).toContain("Error parsing DFA JSON");
    });

    it('should return an error for missing "states" field', () => {
      const invalidJson = JSON.stringify({ alphabet: [], transitions: [], startStateId: "A", acceptStateIds: [] });
      const { dfa, error } = parseDfaJson(invalidJson);
      expect(dfa).toBeNull();
      expect(error).toContain("Missing required fields");
    });
    
    it('should return an error if startStateId is not in states list', () => {
      const dfaObj = JSON.parse(testDfa1Json);
      dfaObj.startStateId = "Z";
      const { dfa, error } = parseDfaJson(JSON.stringify(dfaObj));
      expect(dfa).toBeNull();
      expect(error).toBe("Start state ID not found in states list.");
    });

    it('should return an error if an acceptStateId is not in states list', () => {
      const dfaObj = JSON.parse(testDfa1Json);
      dfaObj.acceptStateIds.push("Z");
      const { dfa, error } = parseDfaJson(JSON.stringify(dfaObj));
      expect(dfa).toBeNull();
      expect(error).toBe("Accept state ID 'Z' not found in states list.");
    });
    
    it('should return an error for invalid transition (from state not found)', () => {
      const dfaObj = JSON.parse(testDfa1Json);
      dfaObj.transitions.push({from: "Z", symbol: "0", to: "A"});
      const { dfa, error } = parseDfaJson(JSON.stringify(dfaObj));
      expect(dfa).toBeNull();
      expect(error).toContain("Transition error: from state 'Z' not found.");
    });

    it('should return an error for invalid transition (to state not found)', () => {
      const dfaObj = JSON.parse(testDfa1Json);
      dfaObj.transitions.push({from: "A", symbol: "0", to: "Z"});
      const { dfa, error } = parseDfaJson(JSON.stringify(dfaObj));
      expect(dfa).toBeNull();
      expect(error).toContain("Transition error: to state 'Z' not found.");
    });
    
    it('should return an error for invalid transition (symbol not in alphabet)', () => {
      const dfaObj = JSON.parse(testDfa1Json);
      dfaObj.transitions.push({from: "A", symbol: "2", to: "B"});
      const { dfa, error } = parseDfaJson(JSON.stringify(dfaObj));
      expect(dfa).toBeNull();
      expect(error).toContain("Transition error: symbol '2' not in alphabet.");
    });
     it('should allow empty states if no startStateId', () => {
        const emptyDfaJson = `{"states": [], "alphabet": ["0"], "transitions": [], "startStateId": null, "acceptStateIds": []}`;
        const { dfa, error } = parseDfaJson(emptyDfaJson);
        expect(error).toBeUndefined();
        expect(dfa).toBeDefined();
        expect(dfa?.states.length).toBe(0);
    });
     it('should error if states empty but startStateId is defined', () => {
        const invalidEmptyDfaJson = `{"states": [], "alphabet": ["0"], "transitions": [], "startStateId": "A", "acceptStateIds": []}`;
        const { dfa, error } = parseDfaJson(invalidEmptyDfaJson);
        expect(dfa).toBeNull();
        expect(error).toBe("DFA must have at least one state if startStateId is defined.");
    });

  });


  describe('findReachableStates', () => {
    it('should find all states for a fully connected DFA (testDfa1)', () => {
      const reachable = findReachableStates(testDfa1);
      expect(reachable).toEqual(new Set(["A", "B", "C", "D", "E", "F", "G", "H"]));
    });

    it('should find only reachable states if some are unreachable', () => {
      const dfaWithUnreachable: Dfa = {
        ...testDfa1,
        states: [...testDfa1.states, { id: "I" }], 
      };
      const reachable = findReachableStates(dfaWithUnreachable);
      expect(reachable).toEqual(new Set(["A", "B", "C", "D", "E", "F", "G", "H"]));
      expect(reachable.has("I")).toBe(false);
    });
     it('should handle DFA with no start state gracefully', () => {
      const noStartDfa: Dfa = {...testDfa1, startStateId: null };
      const reachable = findReachableStates(noStartDfa);
      expect(reachable.size).toBe(0);
    });
     it('should handle DFA where start state is not in states list', () => {
      const invalidStartDfa: Dfa = {...testDfa1, startStateId: "Z" };
      const reachable = findReachableStates(invalidStartDfa);
      expect(reachable.size).toBe(0);
    });
  });

  describe('initializePairTable', () => {
    const reachableStatesDfa1 = testDfa1.states.filter(s => findReachableStates(testDfa1).has(s.id));
    it('should initially mark pairs of (accept, non-accept) states for testDfa1', () => {
      const { marked, statePairs, initialMarkingStep } = initializePairTable(reachableStatesDfa1, testDfa1);
      expect(marked.get(getPairKey("A", "C"))).toBe(true); // A non-accept, C accept
      expect(marked.get(getPairKey("A", "B"))).toBe(false); // Both non-accept
      expect(marked.get(getPairKey("C", "E"))).toBe(false); // Both accept
      expect(initialMarkingStep.newlyMarkedThisIteration.length).toBeGreaterThan(0);
       // C (acc), H (non-acc) -> marked
      expect(marked.get(getPairKey("C", "H"))).toBe(true);
    });
  });

  describe('performIterativeMarking', () => {
    const reachableStatesDfa2 = testDfa2.states.filter(s => findReachableStates(testDfa2).has(s.id));
    const { marked: initialMarkedDfa2, statePairs: statePairsDfa2 } = initializePairTable(reachableStatesDfa2, testDfa2);
    
    it('should perform iterative marking for testDfa2', () => {
      const { finalMarked, steps } = performIterativeMarking(testDfa2, initialMarkedDfa2, statePairsDfa2, reachableStatesDfa2);
      // For testDfa2 (Hopcroft/Ullman example):
      // Initial: (A,E)M, (B,E)M, (C,E)M, (D,E)M. Others Unmarked.
      // Iteration 1:
      //  Consider (A,D): A,1->C; D,1->E. Pair (C,E) is marked. So (A,D) becomes marked.
      //  Consider (B,C): B,1->D; C,1->C. Pair (D,C). If (D,C) becomes marked, then (B,C) becomes marked.
      //      (D,C): D,1->E; C,1->C. Pair (E,C) is marked. So (D,C) becomes marked.
      //      Therefore, (B,C) becomes marked.
      //  Consider (A,B): A,1->C; B,1->D. Pair (C,D) is marked. So (A,B) becomes marked.
      //  Consider (B,D): B,1->D; D,1->E. Pair (D,E) is marked. So (B,D) becomes marked.
      // Unmarked should be (A,C)
      expect(finalMarked.get(getPairKey("A", "D"))).toBe(true);
      expect(finalMarked.get(getPairKey("C", "D"))).toBe(true);
      expect(finalMarked.get(getPairKey("B", "C"))).toBe(true); 
      expect(finalMarked.get(getPairKey("A", "B"))).toBe(true);
      expect(finalMarked.get(getPairKey("B","D"))).toBe(true);
      
      expect(finalMarked.get(getPairKey("A", "C"))).toBe(false); // {A,C} are equivalent
      expect(steps.length).toBeGreaterThanOrEqual(1); 
    });
  });

  describe('groupEquivalentStates', () => {
     const reachableStatesDfa2 = testDfa2.states.filter(s => findReachableStates(testDfa2).has(s.id));
     const { marked: initialMarkedDfa2, statePairs: statePairsDfa2 } = initializePairTable(reachableStatesDfa2, testDfa2);
     const { finalMarked } = performIterativeMarking(testDfa2, initialMarkedDfa2, statePairsDfa2, reachableStatesDfa2);

    it('should group equivalent states for testDfa2', () => {
      const groups = groupEquivalentStates(reachableStatesDfa2, finalMarked);
      const sortedGroups = groups.map(s => Array.from(s).sort()).sort((a,b) => a[0].localeCompare(b[0]));
      
      expect(sortedGroups).toContainEqual(["A", "C"]);
      expect(sortedGroups).toContainEqual(["B", "D"]); // This was an error in manual trace above, (B,D) gets marked.
                                                      // B,1->D, D,1->E. (D,E) is marked. So (B,D) is marked.
                                                      // Let's re-verify testDfa2 logic for equivalence.
                                                      // If (B,D) is marked, then groups are {A,C}, {B}, {D}, {E}
                                                      // Let's re-evaluate:
                                                      // Marked: (A,E)M, (B,E)M, (C,E)M, (D,E)M
                                                      // Iter 1:
                                                      // (A,D) by 1 -> (C,E)M => (A,D)M
                                                      // (C,D) by 1 -> (C,E)M => (C,D)M
                                                      // (B,C) by 1 -> (D,C)M => (B,C)M
                                                      // (A,B) by 1 -> (C,D)M => (A,B)M
                                                      // (B,D) by 1 -> (D,E)M => (B,D)M
                                                      // All pairs involving E are marked. All pairs involving D except (A,C) are marked.
                                                      // (A,C) on 0 -> (B,B) no mark. (A,C) on 1 -> (C,C) no mark. So (A,C) is not marked.
                                                      // This means the actual groups are {A,C}, {B}, {D}, {E}
      
      // Corrected expectations based on re-evaluation:
      expect(sortedGroups).toContainEqual(["A", "C"]);
      expect(sortedGroups).toContainEqual(["B"]);
      expect(sortedGroups).toContainEqual(["D"]);
      expect(sortedGroups).toContainEqual(["E"]);
      expect(groups.length).toBe(4); // {A,C}, {B}, {D}, {E}
    });
  });

  describe('constructMinimizedDfaFromGroups', () => {
    // Using testDfa2, groups should be {A,C}, {B}, {D}, {E}
    const reachableStatesDfa2 = testDfa2.states; // All are reachable
    const { marked: initialMarkedDfa2, statePairs: statePairsDfa2 } = initializePairTable(reachableStatesDfa2, testDfa2);
    const { finalMarked } = performIterativeMarking(testDfa2, initialMarkedDfa2, statePairsDfa2, reachableStatesDfa2);
    const groups = [new Set(["A","C"]), new Set(["B"]), new Set(["D"]), new Set(["E"])]; // Manually providing correct groups

    it('should construct the minimized DFA for testDfa2 (4 states)', () => {
      const minimized = constructMinimizedDfaFromGroups(groups, testDfa2, reachableStatesDfa2);
      expect(minimized).not.toBeNull();
      if (!minimized) return;

      expect(minimized.states.length).toBe(4);
      
      const startState = minimized.states.find(s => s.isStartState);
      expect(startState).toBeDefined();
      expect(startState?.nfaStateIds).toEqual(new Set(["A","C"])); // Group {A,C}

      expect(minimized.acceptStateIds.length).toBe(1);
      const acceptState = minimized.states.find(s => s.id === minimized.acceptStateIds[0]);
      expect(acceptState?.nfaStateIds).toEqual(new Set(["E"])); // Group {E}

      // Let M0={A,C}, M1={B}, M2={D}, M3={E}
      // Transitions:
      // M0 on 0 -> M1 (A,0->B; C,0->B)
      // M0 on 1 -> M0 (A,1->C; C,1->C)
      // M1 on 0 -> M1 (B,0->B)
      // M1 on 1 -> M2 (B,1->D)
      // M2 on 0 -> M1 (D,0->B)
      // M2 on 1 -> M3 (D,1->E)
      // M3 on 0 -> M1 (E,0->B)
      // M3 on 1 -> M0 (E,1->C)
      const M0_ID = startState!.id;
      const M1_ID = minimized.states.find(s => s.nfaStateIds?.has("B"))!.id;
      const M2_ID = minimized.states.find(s => s.nfaStateIds?.has("D"))!.id;
      const M3_ID = acceptState!.id;

      expect(minimized.transitions).toContainEqual({from: M0_ID, symbol: "0", to: M1_ID});
      expect(minimized.transitions).toContainEqual({from: M0_ID, symbol: "1", to: M0_ID});
      expect(minimized.transitions).toContainEqual({from: M1_ID, symbol: "0", to: M1_ID});
      expect(minimized.transitions).toContainEqual({from: M1_ID, symbol: "1", to: M2_ID});
      expect(minimized.transitions).toContainEqual({from: M2_ID, symbol: "0", to: M1_ID});
      expect(minimized.transitions).toContainEqual({from: M2_ID, symbol: "1", to: M3_ID});
      expect(minimized.transitions).toContainEqual({from: M3_ID, symbol: "0", to: M1_ID});
      expect(minimized.transitions).toContainEqual({from: M3_ID, symbol: "1", to: M0_ID});
    });
  });
});
