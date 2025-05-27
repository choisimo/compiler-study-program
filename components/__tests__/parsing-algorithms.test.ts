import {
  parseGrammarFromString,
  calculateFirstSetsInternal,
  calculateFollowSetsInternal,
  constructLL1ParsingTableInternal,
  parseLL1Dynamic,
  // Types for LL(1)
  Grammar, // Assuming this is {[nt: string]: string[][]}
  FirstFollowSets,
  LL1Table,
  ParsingStep,
  // ParsedGrammarResult, // Included in function returns
  // LL1TableConstructionResult, // Included in function returns

  // Functions for LALR(1) / LR(1)
  lr1ItemToString,
  stringToLR1Item,
  computeFirstOfSequence, // This might be slightly different for LR items if it handles lookaheads directly
  lr1Closure,
  lr1Goto,
  buildCanonicalCollectionLR1,
  constructLR1ParsingTable, // Assuming this is the name for the LR(1) table construction
  parseLALR1Dynamic,      // The LR(1)/LALR(1) parser

  // Types for LALR(1) / LR(1)
  LR1ItemSet,
  CanonicalCollectionLR1,
  LR1Transitions,
  LALR1ParsingTable, // This is the structure { action: ..., goto: ... }
  ProductionForReduce // Assuming this type is defined for the numbered productions
} from '../lib/parsing-algorithms'; // Adjust path as necessary

describe('LL(1) Parsing Algorithms', () => {
  describe('parseGrammarFromString', () => {
    it('should parse a simple valid grammar', () => {
      const grammarStr = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
      const result = parseGrammarFromString(grammarStr);
      expect(result.error).toBeUndefined();
      expect(result.startSymbol).toBe('E');
      expect(result.nonTerminals).toEqual(new Set(["E", "E'", "T", "T'", "F"]));
      expect(result.terminals).toEqual(new Set(["+", "*", "(", ")", "id", "$"]));
      expect(result.parsedGrammar['E']).toEqual([['T', "E'"]]);
      expect(result.parsedGrammar["E'"]).toEqual([['+', 'T', "E'"], ['ε']]);
    });

    it('should handle empty input', () => {
      const result = parseGrammarFromString("");
      expect(result.error).toBe("Grammar input is empty.");
      expect(Object.keys(result.parsedGrammar).length).toBe(0);
    });

    it('should detect syntax error (missing ->)', () => {
      const result = parseGrammarFromString("E T E'");
      expect(result.error).toContain("Syntax error");
      expect(result.error).toContain("'->' missing or multiple");
    });
    
    it('should detect syntax error (invalid non-terminal)', () => {
        const result = parseGrammarFromString("e -> t");
        expect(result.error).toContain("Syntax error");
        expect(result.error).toContain("Non-terminal 'e' invalid format");
    });

    it('should correctly identify terminals and non-terminals', () => {
        const grammarStr = "S -> A B\nA -> a\nB -> b | ε";
        const { terminals, nonTerminals, error } = parseGrammarFromString(grammarStr);
        expect(error).toBeUndefined();
        expect(nonTerminals).toEqual(new Set(['S', 'A', 'B']));
        expect(terminals).toEqual(new Set(['a', 'b', '$']));
    });
  });

  describe('calculateFirstSetsInternal', () => {
    const parseResult1 = parseGrammarFromString("S -> A B\nA -> a | ε\nB -> b");
    const simpleGrammar = parseResult1.parsedGrammar;
    const simpleNonTerminals = parseResult1.nonTerminals;
    const simpleTerminals = parseResult1.terminals;

    it('should calculate FIRST sets for a simple grammar', () => {
      const { firstSets, error } = calculateFirstSetsInternal(simpleGrammar, simpleNonTerminals, simpleTerminals);
      expect(error).toBeUndefined();
      expect(firstSets!['A']).toEqual(new Set(['a', 'ε']));
      expect(firstSets!['B']).toEqual(new Set(['b']));
      expect(firstSets!['S']).toEqual(new Set(['a', 'b']));
    });

    const parseResult2 = parseGrammarFromString("S -> A B C\nA -> a | ε\nB -> b | ε\nC -> c | ε");
    it('should handle more complex epsilon productions', () => {
        const { firstSets, error } = calculateFirstSetsInternal(parseResult2.parsedGrammar, parseResult2.nonTerminals, parseResult2.terminals);
        expect(error).toBeUndefined();
        expect(firstSets!['A']).toEqual(new Set(['a', 'ε']));
        expect(firstSets!['B']).toEqual(new Set(['b', 'ε']));
        expect(firstSets!['C']).toEqual(new Set(['c', 'ε']));
        expect(firstSets!['S']).toEqual(new Set(['a', 'b', 'c', 'ε']));
    });
    
    const parseResult3 = parseGrammarFromString("E -> T X\nX -> + T X | ε\nT -> F Y\nY -> * F Y | ε\nF -> id | ( E )");
    it('should handle mutual recursion with epsilons carefully', () => {
        const { firstSets, error } = calculateFirstSetsInternal(parseResult3.parsedGrammar, parseResult3.nonTerminals, parseResult3.terminals);
        expect(error).toBeUndefined();
        expect(firstSets!['F']).toEqual(new Set(['id', '(']));
        expect(firstSets!['Y']).toEqual(new Set(['*', 'ε']));
        expect(firstSets!['T']).toEqual(new Set(['id', '('])); // FIRST(F)
        expect(firstSets!['X']).toEqual(new Set(['+', 'ε']));
        expect(firstSets!['E']).toEqual(new Set(['id', '('])); // FIRST(T)
    });
  });

  describe('calculateFollowSetsInternal', () => {
    const grammarStr = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
    const { parsedGrammar, nonTerminals, terminals, startSymbol } = parseGrammarFromString(grammarStr);
    const { firstSets } = calculateFirstSetsInternal(parsedGrammar, nonTerminals, terminals);

    it('should calculate FOLLOW sets for a standard expression grammar', () => {
      const { followSets, error } = calculateFollowSetsInternal(parsedGrammar, nonTerminals, startSymbol, firstSets!, terminals);
      expect(error).toBeUndefined();
      expect(followSets!['E']).toEqual(new Set([')', '$']));
      expect(followSets!["E'"]).toEqual(new Set([')', '$']));
      expect(followSets!['T']).toEqual(new Set(['+', ')', '$'])); // FOLLOW(E') + FIRST(E') items if E' is not ε
      expect(followSets!["T'"]).toEqual(new Set(['+', ')', '$'])); // FOLLOW(T)
      expect(followSets!['F']).toEqual(new Set(['*', '+', ')', '$']));// FOLLOW(T') + FIRST(T') items if T' is not ε
    });
    
    const grammar2Str = "S -> A B\nA -> a | ε\nB -> b";
    const { parsedGrammar: g2, nonTerminals: nt2, terminals: t2, startSymbol: s2} = parseGrammarFromString(grammar2Str);
    const { firstSets: fs2 } = calculateFirstSetsInternal(g2, nt2, t2);
    it('should handle another grammar for FOLLOW sets', () => {
        const { followSets, error } = calculateFollowSetsInternal(g2, nt2, s2, fs2!, t2);
        expect(error).toBeUndefined();
        expect(followSets!['S']).toEqual(new Set(['$']));
        expect(followSets!['A']).toEqual(new Set(['b'])); 
        expect(followSets!['B']).toEqual(new Set(['$']));
    });
  });

  describe('constructLL1ParsingTableInternal', () => {
    const grammarStr = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
    const { parsedGrammar, nonTerminals, terminals, startSymbol } = parseGrammarFromString(grammarStr);
    const { firstSets } = calculateFirstSetsInternal(parsedGrammar, nonTerminals, terminals);
    const { followSets } = calculateFollowSetsInternal(parsedGrammar, nonTerminals, startSymbol, firstSets!, terminals);

    it('should construct an LL(1) parsing table without conflicts for an LL(1) grammar', () => {
      const { table, conflicts, error } = constructLL1ParsingTableInternal(parsedGrammar, firstSets!, followSets!, nonTerminals, terminals);
      expect(error).toBeUndefined();
      expect(conflicts).toEqual([]);
      expect(table['E']['id']).toBe('E -> T E\'');
      expect(table['E']['(']).toBe('E -> T E\'');
      expect(table["E'"]['+']).toBe("E' -> + T E'");
      expect(table["E'"][')']).toBe("E' -> ε");
      expect(table["E'"]['$']).toBe("E' -> ε");
    });

    const conflictGrammarStr = "S -> A | B\nA -> id\nB -> id";
    const { parsedGrammar: cg, nonTerminals: cn, terminals: ct, startSymbol: cs } = parseGrammarFromString(conflictGrammarStr);
    const { firstSets: cfs } = calculateFirstSetsInternal(cg, cn, ct);
    const { followSets: cfls } = calculateFollowSetsInternal(cg, cn, cs, cfs!, ct);
    it('should detect conflicts in a non-LL(1) grammar', () => {
      const { table, conflicts, error } = constructLL1ParsingTableInternal(cg, cfs!, cfls!, cn, ct);
      expect(error).toBeUndefined(); 
      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain("Conflict at M[S, id]");
    });
  });

  describe('parseLL1Dynamic', () => {
    const grammarStr = "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | id";
    const { parsedGrammar, nonTerminals, terminals, startSymbol } = parseGrammarFromString(grammarStr);
    const { firstSets } = calculateFirstSetsInternal(parsedGrammar, nonTerminals, terminals);
    const { followSets } = calculateFollowSetsInternal(parsedGrammar, nonTerminals, startSymbol, firstSets!, terminals);
    const { table: ll1Table } = constructLL1ParsingTableInternal(parsedGrammar, firstSets!, followSets!, nonTerminals, terminals);

    it('should correctly parse a valid input string "id+id$"', () => {
      const steps = parseLL1Dynamic("id+id", ll1Table, startSymbol, nonTerminals);
      const lastStep = steps[steps.length - 1];
      expect(lastStep.action).toBe("Accept");
      expect(steps[0].action).toBe("Initialize");
      expect(steps[1].action).toBe("E -> T E'");
    });

    it('should reject an invalid input string "id++id$"', () => {
      const steps = parseLL1Dynamic("id++id", ll1Table, startSymbol, nonTerminals);
      const lastStep = steps[steps.length - 1];
      expect(lastStep.action).toContain("Error:");
    });
  });
});


describe('LR(1)/LALR(1) Parsing Algorithms', () => {
  // Grammar G1: S' -> S, S -> C C, C -> c C | d
  const grammarG1Str = "S -> C C\nC -> c C | d";
  const { parsedGrammar: pg1, nonTerminals: nt1, terminals: t1, startSymbol: ss1 } = parseGrammarFromString(grammarG1Str);
  const augG1: Grammar = { ...pg1, "S'": [['S']] };
  const augNt1 = new Set([...nt1, "S'"]);
  const { firstSets: fs1, error: fs1Error } = calculateFirstSetsInternal(augG1, augNt1, t1);
  expect(fs1Error).toBeUndefined();

  describe('LR(1) Item Helpers', () => {
    it('lr1ItemToString should format item correctly', () => {
      expect(lr1ItemToString('S', ['C', 'C'], 1, '$')).toBe('[S -> C . C, $]');
      expect(lr1ItemToString('C', ['c', 'C'], 0, 'c')).toBe('[C -> . c C, c]');
    });

    it('stringToLR1Item should parse item string correctly', () => {
      const item1 = stringToLR1Item('[S -> C . C, $]');
      expect(item1).toEqual({ nt: 'S', ruleBody: ['C', 'C'], dot: 1, lookahead: '$' });
      const item2 = stringToLR1Item('[C -> . c C, c/d/$]'); // Assuming lookaheads can be complex like this if needed by some representations
      // For simplicity, current stringToLR1Item expects single char/symbol lookahead
      // expect(item2).toEqual({ nt: 'C', ruleBody: ['c', 'C'], dot: 0, lookahead: 'c/d/$' });
       const item3 = stringToLR1Item('[C -> d ., $]');
       expect(item3).toEqual({ nt: 'C', ruleBody: ['d'], dot: 1, lookahead: '$' });
    });
  });
  
  describe('computeFirstOfSequence (for LR lookaheads)', () => {
    // S -> A B, A -> a | ε, B -> b
    // For item [S' -> .S, $], lookahead for A -> .a is FIRST(B$)
    const { parsedGrammar: g, nonTerminals: nts, terminals: ts } = parseGrammarFromString("S -> A B\nA -> a | ε\nB -> b");
    const { firstSets: fs } = calculateFirstSetsInternal(g, nts, ts);
    
    it('should compute FIRST of sequence (beta + a)', () => {
        // For item [X -> Y . Z beta, l1], for Z -> .gamma, lookahead is FIRST(beta l1)
        // Example: beta = ['B'], a = '$', FIRST(B$) = {b}
        const result = computeFirstOfSequence(['B', '$'], fs!, ts, nts); // Need to pass nts for non-terminal check
        expect(result).toEqual(new Set(['b']));
    });
     it('should compute FIRST of sequence where first part is epsilon', () => {
        // Example: A -> ε, beta = ['A', 'b'], a = '$', FIRST(Ab$) = {b}
        const result = computeFirstOfSequence(['A', 'b', '$'], fs!, ts, nts);
        expect(result).toEqual(new Set(['b']));
    });
    it('should compute FIRST of sequence resulting in epsilon', () => {
        // Example: A -> ε, B -> ε, beta = ['A', 'B'], a = '$', FIRST(AB$) = {$}
        const { parsedGrammar: gEps, nonTerminals: ntsEps, terminals: tsEps } = parseGrammarFromString("S -> A B\nA -> ε\nB -> ε");
        const { firstSets: fsEps } = calculateFirstSetsInternal(gEps, ntsEps, tsEps);
        const result = computeFirstOfSequence(['A', 'B', '$'], fsEps!, tsEps, ntsEps);
        expect(result).toEqual(new Set(['$', 'ε'])); // Epsilon because A->ε, B->ε, so sequence can be ε, then lookahead is $
    });
  });


  describe('lr1Closure', () => {
    it('should compute closure for S\' -> .S, $ from G1', () => {
      const initialItem = lr1ItemToString("S'", ['S'], 0, '$');
      const closure = lr1Closure(new Set([initialItem]), augG1, fs1!, augNt1, t1);
      // Expected:
      // [S' -> . S, $]
      // [S -> . C C, $]
      // [C -> . c C, c/d] (because FIRST(C$) = {c,d})
      // [C -> . d, c/d]
      expect(closure).toContain(initialItem);
      expect(closure).toContain(lr1ItemToString('S', ['C', 'C'], 0, '$'));
      expect(closure).toContain(lr1ItemToString('C', ['c', 'C'], 0, 'c'));
      expect(closure).toContain(lr1ItemToString('C', ['c', 'C'], 0, 'd'));
      expect(closure).toContain(lr1ItemToString('C', ['d'], 0, 'c'));
      expect(closure).toContain(lr1ItemToString('C', ['d'], 0, 'd'));
    });
  });

  describe('lr1Goto', () => {
    const I0_kernel = new Set([lr1ItemToString("S'", ['S'], 0, '$')]);
    const I0 = lr1Closure(I0_kernel, augG1, fs1!, augNt1, t1);

    it('Goto(I0, S) should be { [S\' -> S ., $] }', () => {
      const goto_I0_S = lr1Goto(I0, 'S', augG1, fs1!, augNt1, t1);
      expect(goto_I0_S).toEqual(new Set([lr1ItemToString("S'", ['S'], 1, '$')]));
    });

    it('Goto(I0, C) should lead to a new state', () => {
      const goto_I0_C = lr1Goto(I0, 'C', augG1, fs1!, augNt1, t1);
      // Expected kernel: [S -> C . C, $]
      // Closure will add: [C -> . c C, $], [C -> . d, $] (because FIRST(C$) = {c,d}, but here C is followed by '$' in S->C.C, $)
      // Lookahead for C -> .cC is FIRST(C$) = {c,d} because S -> C.C, $
      // Actually, for S -> C . C, $, the lookahead for C -> .gamma is $.
      expect(goto_I0_C).toContain(lr1ItemToString('S', ['C', 'C'], 1, '$'));
      expect(goto_I0_C).toContain(lr1ItemToString('C', ['c', 'C'], 0, '$'));
      expect(goto_I0_C).toContain(lr1ItemToString('C', ['d'], 0, '$'));
    });
  });
  
  describe('buildCanonicalCollectionLR1', () => {
    it('should build the CC for G1', () => {
        const { itemSets, transitions, error } = buildCanonicalCollectionLR1(augG1, fs1!, augNt1, t1, "S'");
        expect(error).toBeUndefined();
        // G1: S' -> S, S -> C C, C -> c C | d
        // I0: Closure({[S' -> .S, $]})
        // I1: Goto(I0,S) = {[S' -> S., $]}
        // I2: Goto(I0,C) = Closure({[S -> C.C, $]}) = {[S->C.C,$], [C->.cC,$], [C->.d,$]}
        // I3: Goto(I0,c) = Closure({[C -> c.C, c/d]}) = {[C->c.C,c/d], [C->.cC,c/d], [C->.d,c/d]}
        // I4: Goto(I0,d) = Closure({[C -> d., c/d]}) = {[C->d.,c/d]}
        // ... and so on. There should be more states.
        expect(itemSets.size).toBeGreaterThan(4); // Check for a reasonable number of states
        expect(transitions.get(0)?.get('S')).toBe(1); // Example transition
    });
  });

  describe('constructLR1ParsingTable', () => {
    // This test requires a fully worked out LR(1) item set and transitions for G1.
    // For brevity, we'll test with a very small, known LR(0) grammar that's also LR(1).
    // S' -> S, S -> a
    const lr0GrammarStr = "S -> a";
    const { parsedGrammar: pgLR0, nonTerminals: ntLR0, terminals: tLR0, startSymbol: ssLR0 } = parseGrammarFromString(lr0GrammarStr);
    const augLR0: Grammar = { ...pgLR0, "S'": [['S']] };
    const augNtLR0 = new Set([...ntLR0, "S'"]);
    const { firstSets: fsLR0 } = calculateFirstSetsInternal(augLR0, augNtLR0, tLR0);
    const { itemSets: ccLR0, transitions: trLR0, error: ccError } = buildCanonicalCollectionLR1(augLR0, fsLR0!, augNtLR0, tLR0, "S'");
    expect(ccError).toBeUndefined();

    const productionRulesList: ProductionForReduce[] = [
        { nt: "S'", body: ['S'], ruleNumber:1 }, // Rule 1: S' -> S
        { nt: "S", body: ['a'], ruleNumber:2 },  // Rule 2: S -> a
    ];

    it('should build LR(1) table for S\' -> S, S -> a', () => {
        const { action, goto, error: tableError, conflicts } = constructLR1ParsingTable(ccLR0, trLR0, augLR0, augNtLR0, tLR0, "S'", productionRulesList);
        expect(tableError).toBeUndefined();
        expect(conflicts).toEqual([]);
        // I0: {[S'->.S,$], [S->.a,$]} --a--> I2 --S--> I1
        // I1: {[S'->S.,$]}
        // I2: {[S->a.,$]}
        expect(action[0]['a']).toBe('s2');
        expect(goto[0]['S']).toBe(1);
        expect(action[1]['$']).toBe('acc');
        expect(action[2]['$']).toBe('r2'); // Reduce S -> a
    });
  });
  
  describe('parseLALR1Dynamic', () => {
    // Using table from S' -> S, S -> a
    const lr0GrammarStr = "S -> a";
    const { parsedGrammar: pgLR0, nonTerminals: ntLR0, terminals: tLR0, startSymbol: ssLR0 } = parseGrammarFromString(lr0GrammarStr);
    const augLR0: Grammar = { ...pgLR0, "S'": [['S']] };
    const augNtLR0 = new Set([...ntLR0, "S'"]);
    const { firstSets: fsLR0 } = calculateFirstSetsInternal(augLR0, augNtLR0, tLR0);
    const { itemSets: ccLR0, transitions: trLR0 } = buildCanonicalCollectionLR1(augLR0, fsLR0!, augNtLR0, tLR0, "S'");
    const productionRulesList: ProductionForReduce[] = [ { nt: "S'", body: ['S'], ruleNumber:1 }, { nt: "S", body: ['a'], ruleNumber:2 } ];
    const { action, goto } = constructLR1ParsingTable(ccLR0, trLR0, augLR0, augNtLR0, tLR0, "S'", productionRulesList);
    const table: LALR1ParsingTable = { action, goto };

    it('should parse "a" correctly', () => {
        const steps = parseLALR1Dynamic("a", table, augLR0, "S'", productionRulesList, tLR0, augNtLR0);
        expect(steps[steps.length -1].actionMessage).toBe("Accept");
    });
     it('should reject "b"', () => {
        const steps = parseLALR1Dynamic("b", table, augLR0, "S'", productionRulesList, tLR0, augNtLR0);
        expect(steps[steps.length -1].actionMessage).toContain("Error: No action");
    });
  });

});
