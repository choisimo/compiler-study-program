// Assuming these types are defined here or imported from a shared types file
// For the purpose of this exercise, I'll define them here if not already present
// from a previous step where they might have been moved from ParsingVisualizer.

// Grammar where each non-terminal maps to an array of its productions (each production is string[])
export interface Grammar {
  [nonTerminal: string]: string[][]; 
}

export interface FirstFollowSets {
  [nonTerminal: string]: Set<string>;
}

export interface LL1Table {
  [nonTerminal: string]: {
    [terminal: string]: string; // The string is the production rule, e.g., "E -> T E'"
  };
}

export interface ParsingStep {
  stack: string;
  input: string;
  action: string;
}


export interface ParsedGrammarResult {
  parsedGrammar: Grammar; 
  nonTerminals: Set<string>;
  terminals: Set<string>;
  startSymbol: string;
  error?: string;
}

export const parseGrammarFromString = (grammarInput: string): ParsedGrammarResult => {
  const parsedGrammar: Grammar = {};
  const nonTerminals = new Set<string>();
  const allEncounteredSymbols = new Set<string>(); 
  let startSymbol = "";
  let error: string | undefined = undefined;

  const lines = grammarInput.trim().split('\n').filter(line => line.trim() !== "");
  if (lines.length === 0) {
    return { 
        parsedGrammar, nonTerminals, terminals: new Set(["$"]), 
        startSymbol, error: "Grammar input is empty." 
    };
  }

  try {
    lines.forEach((line, index) => {
      const parts = line.split("->");
      if (parts.length !== 2) throw new Error(`Syntax error (Rule ${index + 1}: "${line}"): '->' missing or multiple.`);
      
      const nonTerminal = parts[0].trim();
      if (!/^[A-Z]'*$/.test(nonTerminal)) throw new Error(`Syntax error (Rule ${index + 1}: "${line}"): Non-terminal '${nonTerminal}' invalid format.`);
      
      if (index === 0 && !startSymbol) startSymbol = nonTerminal;
      nonTerminals.add(nonTerminal);
      allEncounteredSymbols.add(nonTerminal);
      
      parsedGrammar[nonTerminal] = parsedGrammar[nonTerminal] || [];

      const productionsStrings = parts[1].split("|").map(p => p.trim());
      productionsStrings.forEach(prodStr => {
        if (!prodStr) throw new Error(`Syntax error (Rule ${index + 1}: "${line}"): Empty production rule body.`);
        const symbols = prodStr.split(/\s+/).filter(s => s);
        if (symbols.length === 0 && prodStr !== "ε") throw new Error(`Syntax error (Rule ${index + 1}: "${line}"): Symbol missing. Use ε for epsilon.`);
        
        const ruleBody = (symbols.length === 0 && prodStr === "ε") ? ["ε"] : symbols;
        parsedGrammar[nonTerminal].push(ruleBody);
        ruleBody.forEach(s => allEncounteredSymbols.add(s));
      });
    });

    const terminals = new Set<string>();
    allEncounteredSymbols.forEach(sym => {
      if (!nonTerminals.has(sym) && sym !== "ε") terminals.add(sym);
    });
    terminals.add("$");
    return { parsedGrammar, nonTerminals, terminals, startSymbol, error };
  } catch (e: any) {
    return { 
        parsedGrammar: {}, nonTerminals: new Set(), terminals: new Set(["$"]), 
        startSymbol: "", error: e.message 
    };
  }
};


export const calculateFirstSetsInternal = (
  parsedGrammar: Grammar, 
  nonTerminals: Set<string>,
  terminals: Set<string>
): {firstSets: FirstFollowSets, error?: string} => {
  const firstSets: FirstFollowSets = {};
  nonTerminals.forEach(nt => firstSets[nt] = new Set<string>());
  terminals.forEach(t => {
      if (t !== "ε") firstSets[t] = new Set<string>([t]);
  });
  firstSets["ε"] = new Set<string>(["ε"]);

  let changed = true;
  let iteration = 0;
  const maxIterations = (nonTerminals.size * Object.keys(parsedGrammar).length) + terminals.size + 10; // Adjusted limit

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;
    nonTerminals.forEach(nt => {
      const rules = parsedGrammar[nt];
      if (!rules) return;

      rules.forEach(rule => {
        let canDeriveEpsilonForRule = true;
        for (const symbol of rule) {
          if (symbol === "ε") { 
            if (!firstSets[nt].has("ε")) { firstSets[nt].add("ε"); changed = true; }
            break; 
          }

          if (terminals.has(symbol)) {
            if (!firstSets[nt].has(symbol)) { firstSets[nt].add(symbol); changed = true; }
            canDeriveEpsilonForRule = false; 
            break; 
          }
          
          if (nonTerminals.has(symbol)) {
            if (!firstSets[symbol]) return { firstSets, error: `FIRST set error: Symbol '${symbol}' in rule '${nt} -> ${rule.join(' ')}' has no defined FIRST set.`};
            firstSets[symbol].forEach(f => {
              if (f !== "ε" && !firstSets[nt].has(f)) { firstSets[nt].add(f); changed = true; }
            });
            if (!firstSets[symbol].has("ε")) {
              canDeriveEpsilonForRule = false;
              break;
            }
          } else { 
             return { firstSets, error: `FIRST set error: Unknown symbol '${symbol}' in rule '${nt} -> ${rule.join(' ')}'.`};
          }
        }
        if (canDeriveEpsilonForRule && !firstSets[nt].has("ε")) {
          firstSets[nt].add("ε"); changed = true;
        }
      });
    });
  }
  if (iteration >= maxIterations && changed) {
      return {firstSets, error: "FIRST set calculation possibly stuck in a loop."};
  }
  return {firstSets};
};

export const calculateFollowSetsInternal = (
  parsedGrammar: Grammar, 
  nonTerminals: Set<string>,
  startSymbol: string,
  firstSets: FirstFollowSets,
  terminals: Set<string> 
): {followSets: FirstFollowSets, error?: string} => {
  const followSets: FirstFollowSets = {};
  nonTerminals.forEach(nt => followSets[nt] = new Set<string>());
  
  if (startSymbol && !nonTerminals.has(startSymbol) && Object.keys(parsedGrammar).length > 0) { // Check if startSymbol is valid only if grammar is not empty
      return {followSets, error: `Follow set error: Start symbol '${startSymbol}' is not a defined non-terminal.`};
  }
  if (startSymbol && nonTerminals.has(startSymbol)) followSets[startSymbol].add("$");


  let changed = true;
  let iteration = 0;
  const maxIterations = (nonTerminals.size * Object.keys(parsedGrammar).length) + 5;

  const computeFirstOfSequence = ( sequence: string[] ): Set<string> => {
    const result = new Set<string>();
    let allPreviousDeriveEpsilon = true;
    for (const sym of sequence) {
      if (terminals.has(sym)) {
        result.add(sym); allPreviousDeriveEpsilon = false; break;
      }
      if (nonTerminals.has(sym)) {
        if(!firstSets[sym]) throw new Error(`computeFirstOfSequence (for FOLLOW): Symbol '${sym}' has no FIRST set.`);
        firstSets[sym].forEach(f => { if (f !== "ε") result.add(f); });
        if (!firstSets[sym].has("ε")) { allPreviousDeriveEpsilon = false; break; }
      } else if (sym === "ε") { continue; }
        else if (sym === "$") { 
        result.add("$"); allPreviousDeriveEpsilon = false; break;
      } else {
         throw new Error(`computeFirstOfSequence (for FOLLOW): Unknown symbol '${sym}'`);
      }
    }
    if (allPreviousDeriveEpsilon) result.add("ε");
    return result;
  };


  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;
    nonTerminals.forEach(ntA => {
      const rulesA = parsedGrammar[ntA];
      if (!rulesA) return;

      rulesA.forEach(rule => { 
        for (let i = 0; i < rule.length; i++) {
          const symbolB = rule[i];
          if (!nonTerminals.has(symbolB)) continue;

          const beta = rule.slice(i + 1);
          const firstOfBeta = beta.length > 0 ? computeFirstOfSequence(beta) : new Set(["ε"]);
          
          firstOfBeta.forEach(f => {
            if (f !== "ε" && !followSets[symbolB].has(f)) { followSets[symbolB].add(f); changed = true; }
          });

          if (firstOfBeta.has("ε")) {
            if (!followSets[ntA]) throw new Error(`Follow set error: Non-terminal '${ntA}' missing from followSets map.`);
            followSets[ntA].forEach(f => {
              if (!followSets[symbolB].has(f)) { followSets[symbolB].add(f); changed = true; }
            });
          }
        }
      });
    });
  }
   if (iteration >= maxIterations && changed) {
      return {followSets, error: "FOLLOW set calculation possibly stuck in a loop."};
  }
  return {followSets};
};

export interface LL1TableConstructionResult {
    table: LL1Table;
    conflicts: string[];
    error?: string;
}

export const constructLL1ParsingTableInternal = (
  parsedGrammar: Grammar, 
  firstSets: FirstFollowSets,
  followSets: FirstFollowSets,
  nonTerminals: Set<string>,
  terminals: Set<string> 
): LL1TableConstructionResult => {
  const table: LL1Table = {};
  const conflicts: string[] = [];
  
  const computeFirstOfSequence = ( sequence: string[] ): Set<string> => {
    const result = new Set<string>();
    let allPreviousDeriveEpsilon = true;
    for (const sym of sequence) {
      if (terminals.has(sym)) {
        result.add(sym); allPreviousDeriveEpsilon = false; break;
      }
      if (nonTerminals.has(sym)) {
         if(!firstSets[sym]) throw new Error(`computeFirstOfSequence (for LL1 table): Symbol '${sym}' has no FIRST set.`);
        firstSets[sym].forEach(f => { if (f !== "ε") result.add(f); });
        if (!firstSets[sym].has("ε")) { allPreviousDeriveEpsilon = false; break; }
      } else if (sym === "ε") { continue; }
        else if (sym === "$") { 
        result.add("$"); allPreviousDeriveEpsilon = false; break;
      } else {
         throw new Error(`computeFirstOfSequence (for LL1 table): Unknown symbol '${sym}'`);
      }
    }
    if (allPreviousDeriveEpsilon) result.add("ε");
    return result;
  };

  for (const ntA of nonTerminals) {
    table[ntA] = {};
    const rulesA = parsedGrammar[ntA];
    if (!rulesA) continue;

    rulesA.forEach(alpha => { 
      const firstOfAlpha = computeFirstOfSequence(alpha);

      firstOfAlpha.forEach(terminalA_or_epsilon => {
        if (terminalA_or_epsilon !== "ε") { 
          const terminalA = terminalA_or_epsilon;
          const ruleString = `${ntA} -> ${alpha.join(" ")}`;
          if (table[ntA][terminalA] && table[ntA][terminalA] !== ruleString) {
            conflicts.push(`Conflict at M[${ntA}, ${terminalA}]: existing='${table[ntA][terminalA]}', new='${ruleString}'`);
          }
          table[ntA][terminalA] = ruleString;
        }
      });

      if (firstOfAlpha.has("ε")) {
        const followOfA = followSets[ntA];
        if (!followOfA) throw new Error(`LL(1) Table error: Non-terminal '${ntA}' has no FOLLOW set.`);
        
        followOfA.forEach(terminalB => { 
          const ruleString = `${ntA} -> ${alpha.join(" ")}`;
          if (terminals.has(terminalB)) { 
            if (table[ntA][terminalB] && table[ntA][terminalB] !== ruleString) {
              conflicts.push(`Conflict at M[${ntA}, ${terminalB}] (using FOLLOW set): existing='${table[ntA][terminalB]}', new='${ruleString}'`);
            }
            table[ntA][terminalB] = ruleString;
          }
        });
      }
    });
  }
  return { table, conflicts };
};

export const parseLL1Dynamic = (
    currentInput: string, 
    table: LL1Table, 
    grammarStartSymbol: string,
    grammarNonTerminals: Set<string>
  ): ParsingStep[] => {
    const generatedSteps: ParsingStep[] = [];
    let input = currentInput.endsWith("$") ? currentInput : currentInput + "$";
    
    let stack: string[] = ["$", grammarStartSymbol];
    let inputPtr = 0;
    let currentAction = "Initialize"; // Initial action for the first step

    let maxSteps = Math.max(200, input.length * 5); // Adjust max steps based on input length
    let stepCount = 0;

    while(stepCount++ < maxSteps) {
      const stackTop = stack[stack.length - 1];
      const currentInputSymbol = input[inputPtr];

      generatedSteps.push({
        stack: stack.slice().reverse().join(""), 
        input: input.substring(inputPtr),
        action: currentAction 
      });
      currentAction = ""; 

      if (stackTop === "$" && currentInputSymbol === "$") {
        currentAction = "Accept";
        generatedSteps.push({ stack: "$", input: "$", action: currentAction });
        break;
      }
      if (stackTop === "$" || currentInputSymbol === undefined) { 
        currentAction = "Error: Unexpected end of stack or input";
        if(generatedSteps[generatedSteps.length-1].action !== currentAction) // Avoid duplicate error step
            generatedSteps.push({ stack: stack.slice().reverse().join(""), input: input.substring(inputPtr), action: currentAction });
        break;
      }

      if (grammarNonTerminals.has(stackTop)) { 
        const rule = table[stackTop]?.[currentInputSymbol];
        if (rule) {
          currentAction = `${rule}`; // Changed from "Predict: " for brevity matching original
          stack.pop(); 
          const [_, rhsString] = rule.split("->");
          const rhsSymbols = rhsString.trim().split(/\s+/).filter(s => s);
          if (rhsSymbols[0] !== "ε") { 
            for (let i = rhsSymbols.length - 1; i >= 0; i--) {
              stack.push(rhsSymbols[i]);
            }
          }
        } else {
          currentAction = `Error: No rule in table M[${stackTop}, ${currentInputSymbol}]`;
           if(generatedSteps[generatedSteps.length-1].action !== currentAction)
             generatedSteps.push({ stack: stack.slice().reverse().join(""), input: input.substring(inputPtr), action: currentAction });
          break;
        }
      } else { // Terminal on stack top
        if (stackTop === currentInputSymbol) {
          currentAction = `Match ${currentInputSymbol}`; // Changed from "Match: "
          stack.pop();
          inputPtr++;
        } else {
          currentAction = `Error: Mismatch (Stack: ${stackTop}, Input: ${currentInputSymbol})`;
           if(generatedSteps[generatedSteps.length-1].action !== currentAction)
            generatedSteps.push({ stack: stack.slice().reverse().join(""), input: input.substring(inputPtr), action: currentAction });
          break;
        }
      }
      if (stepCount >= maxSteps -1 ) { 
         currentAction = "Error: Max parsing steps reached. Possible loop or complex parse.";
         if(generatedSteps[generatedSteps.length-1].action !== currentAction)
            generatedSteps.push({ stack: stack.slice().reverse().join(""), input: input.substring(inputPtr), action: currentAction });
         break;
      }
    }
    return generatedSteps;
  };
