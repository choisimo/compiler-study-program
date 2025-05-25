"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Added for grammar input
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, RotateCcw, ArrowRight } from "lucide-react"

// Added type definitions
interface ParsingStep {
  stack: string;
  input: string;
  action: string;
}

interface ExampleOption {
  label: string;
  value: string; // This is the input string for the example
}

// --- START: Added type definitions for LL(1) ---
type ProductionRule = string[]; // e.g., ["T", "E'"] or ["ε"] or ["a"]
interface Grammar {
  [nonTerminal: string]: ProductionRule[]; // E.g. E -> T E' | a becomes { "E": [ ["T", "E'"], ["a"] ] }
}
interface FirstFollowSets {
  [nonTerminal:string]: Set<string>; // E.g. { "E": new Set(["a", "("]) }
}
// --- END: Added type definitions for LL(1) ---

// --- START: Added type definitions for LALR(1) ---
// An LR(1) item: [A -> α . β, a] where 'a' is the lookahead terminal.
// Stringified for use in Sets: "[A -> alpha . beta, lookahead]"
type LR1ItemString = string; 
type LR1ItemSet = Set<LR1ItemString>; 
type CanonicalCollectionLR1 = Map<number, LR1ItemSet>; // Key is state ID
type LR1Transitions = Map<number, Map<string, number>>; // StateID -> (Symbol -> StateID)

// LALR(1) specific types
// For LALR(1) states, the structure of items and sets is the same, but items within a set might have merged lookaheads.
type LALR1ParsingTable = {
  action: { [stateId: number]: { [terminal: string]: string } }; // e.g., s5 (shift to state 5), r3 (reduce by rule 3), acc (accept)
  goto: { [stateId: number]: { [nonTerminal: string]: number } }; // e.g., GOTO[state, NonTerminal] = nextState
};
// --- END: Added type definitions for LALR(1) ---

// Moved to parsing-algorithms.ts or a shared types file if these become more common.
// For now, they are here and also expected by parsing-algorithms.ts for import.
// Keeping them here allows the component to function without immediately creating a shared types file.
// Duplication is temporary if a types file isn't made next.
export interface LL1Table { // This was already here, just confirming its use
  [nonTerminal: string]: {
    [terminal: string]: string; // The string is the production rule, e.g., "E → TE'"
  };
}

interface SLRTableAction {
  [symbol: string]: string; // e.g., "s2", "r1", "accept", or a state number for GOTO
}

interface SLRTable {
  [state: number]: SLRTableAction;
}

type ExampleSet = {
  [inputString: string]: ParsingStep[];
};

interface ParsingVisualizerProps {
  type: "ll1" | "slr1" | "lalr1"
}

const ll1TableData: LL1Table = {
  E: { a: "E → TE'", "(": "E → TE'" },
  "E'": { "+": "E' → +TE'", ")": "E' → ε", "$": "E' → ε" },
  T: { a: "T → FT'", "(": "T → FT'" },
  "T'": { "+": "T' → ε", "*": "T' → *FT'", ")": "T' → ε", "$": "T' → ε" },
  F: { a: "F → a", "(": "F → (E)" },
};

/*
// This is the original ll1TableData, it will be removed once dynamic generation is complete.
const ll1TableData: LL1Table = {
 E: { a: "E → TE'", "(": "E → TE'" },
 "E'": { "+": "E' → +TE'", ")": "E' → ε", "$": "E' → ε" },
 T: { a: "T → FT'", "(": "T → FT'" },
 "T'": { "+": "T' → ε", "*": "T' → *FT'", ")": "T' → ε", "$": "T' → ε" },
 F: { a: "F → a", "(": "F → (E)" },
};
*/

// const ll1TableData: LL1Table = {
// E: { a: "E → TE'", "(": "E → TE'" },
// "E'": { "+": "E' → +TE'", ")": "E' → ε", "$": "E' → ε" },
// T: { a: "T → FT'", "(": "T → FT'" },
// "T'": { "+": "T' → ε", "*": "T' → *FT'", ")": "T' → ε", "$": "T' → ε" },
// F: { a: "F → a", "(": "F → (E)" },
// };

const slrTableData: SLRTable = {
  0: { n: "s2", E: "1" },
  1: { "+": "s3", "$": "accept" },
  2: { "+": "r2", "$": "r2" },
  3: { n: "s4" }, 
  4: { "+": "r1", "$": "r1" },
};

const ll1ExampleSet: ExampleSet = {
  "a+a$": [
    { stack: "$E", input: "a+a$", action: "E → TE'" },
    { stack: "$E'T", input: "a+a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a+a$", action: "F → a" },
    { stack: "$E'T'a", input: "a+a$", action: "Match a" },
    { stack: "$E'T'", input: "+a$", action: "T' → ε" },
    { stack: "$E'", input: "+a$", action: "E' → +TE'" },
    { stack: "$E'T+", input: "+a$", action: "Match +" },
    { stack: "$E'T", input: "a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a$", action: "F → a" },
    { stack: "$E'T'a", input: "a$", action: "Match a" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "a$": [
    { stack: "$E", input: "a$", action: "E → TE'" },
    { stack: "$E'T", input: "a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a$", action: "F → a" },
    { stack: "$E'T'a", input: "a$", action: "Match a" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "(a)$": [
    { stack: "$E", input: "(a)$", action: "E → TE'" },
    { stack: "$E'T", input: "(a)$", action: "T → FT'" },
    { stack: "$E'T'F", input: "(a)$", action: "F → (E)" },
    { stack: "$E'T')E(", input: "(a)$", action: "Match (" },
    { stack: "$E'T')E", input: "a)$", action: "E → TE'" },
    { stack: "$E'T')E'T", input: "a)$", action: "T → FT'" },
    { stack: "$E'T')E'T'F", input: "a)$", action: "F → a" },
    { stack: "$E'T')E'T'a", input: "a)$", action: "Match a" },
    { stack: "$E'T')E'T'", input: ")$", action: "T' → ε" },
    { stack: "$E'T')E'", input: ")$", action: "E' → ε" },
    { stack: "$E'T')", input: ")$", action: "Match )" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
  "a*a$": [
    { stack: "$E", input: "a*a$", action: "E → TE'" },
    { stack: "$E'T", input: "a*a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a*a$", action: "F → a" },
    { stack: "$E'T'a", input: "a*a$", action: "Match a" },
    { stack: "$E'T'", input: "*a$", action: "T' → *FT'" },
    { stack: "$E'T'F*", input: "*a$", action: "Match *" }, 
    { stack: "$E'T'F", input: "a$", action: "F → a" }, 
    { stack: "$E'T'a", input: "a$", action: "Match a" }, 
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
};

/*
// This is the original ll1ExampleSet, it will be removed once dynamic generation is complete.
const ll1ExampleSet: ExampleSet = {
 "a+a$": [
    { stack: "$E", input: "a+a$", action: "E → TE'" },
    // ... other steps
  ],
  // ... other examples
};
*/

// const ll1ExampleSet: ExampleSet = {
// "a+a$": [
// { stack: "$E", input: "a+a$", action: "E → TE'" },
// { stack: "$E'T", input: "a+a$", action: "T → FT'" },
// { stack: "$E'T'F", input: "a+a$", action: "F → a" },
// { stack: "$E'T'a", input: "a+a$", action: "Match a" },
// { stack: "$E'T'", input: "+a$", action: "T' → ε" },
// { stack: "$E'", input: "+a$", action: "E' → +TE'" },
// { stack: "$E'T+", input: "+a$", action: "Match +" },
// { stack: "$E'T", input: "a$", action: "T → FT'" },
// { stack: "$E'T'F", input: "a$", action: "F → a" },
// { stack: "$E'T'a", input: "a$", action: "Match a" },
// { stack: "$E'T'", input: "$", action: "T' → ε" },
// { stack: "$E'", input: "$", action: "E' → ε" },
// { stack: "$", input: "$", action: "Accept" },
// ],
// "a$": [
// { stack: "$E", input: "a$", action: "E → TE'" },
// { stack: "$E'T", input: "a$", action: "T → FT'" },
// { stack: "$E'T'F", input: "a$", action: "F → a" },
// { stack: "$E'T'a", input: "a$", action: "Match a" },
// { stack: "$E'T'", input: "$", action: "T' → ε" },
// { stack: "$E'", input: "$", action: "E' → ε" },
// { stack: "$", input: "$", action: "Accept" },
// ],
// "(a)$": [
// { stack: "$E", input: "(a)$", action: "E → TE'" },
// { stack: "$E'T", input: "(a)$", action: "T → FT'" },
// { stack: "$E'T'F", input: "(a)$", action: "F → (E)" },
// { stack: "$E'T')E(", input: "(a)$", action: "Match (" },
// { stack: "$E'T')E", input: "a)$", action: "E → TE'" },
// { stack: "$E'T')E'T", input: "a)$", action: "T → FT'" },
// { stack: "$E'T')E'T'F", input: "a)$", action: "F → a" },
// { stack: "$E'T')E'T'a", input: "a)$", action: "Match a" },
// { stack: "$E'T')E'T'", input: ")$", action: "T' → ε" },
// { stack: "$E'T')E'", input: ")$", action: "E' → ε" },
// { stack: "$E'T')", input: ")$", action: "Match )" },
// { stack: "$E'T'", input: "$", action: "T' → ε" },
// { stack: "$E'", input: "$", action: "E' → ε" },
// { stack: "$", input: "$", action: "Accept" },
// ],
// "a*a$": [
// { stack: "$E", input: "a*a$", action: "E → TE'" },
// { stack: "$E'T", input: "a*a$", action: "T → FT'" },
// { stack: "$E'T'F", input: "a*a$", action: "F → a" },
// { stack: "$E'T'a", input: "a*a$", action: "Match a" },
// { stack: "$E'T'", input: "*a$", action: "T' → *FT'" },
// { stack: "$E'T'F*", input: "*a$", action: "Match *" },
// { stack: "$E'T'F", input: "a$", action: "F → a" },
// { stack: "$E'T'a", input: "a$", action: "Match a" },
// { stack: "$E'T'", input: "$", action: "T' → ε" },
// { stack: "$E'", input: "$", action: "E' → ε" },
// { stack: "$", input: "$", action: "Accept" },
// ],
// };

const slrExampleSet: ExampleSet = {
  "n+n$": [
    { stack: "$0", input: "n+n$", action: "Shift 2" },
    { stack: "$0n2", input: "+n$", action: "Reduce E→n" },
    { stack: "$0E1", input: "+n$", action: "Shift 3" },
    { stack: "$0E1+3", input: "n$", action: "Shift 4" },
    { stack: "$0E1+3n4", input: "$", action: "Reduce E→n" },
    { stack: "$0E1+3E5", input: "$", action: "Reduce E→E+E" },//
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
  "n$": [
    { stack: "$0", input: "n$", action: "Shift 2" },
    { stack: "$0n2", input: "$", action: "Reduce E→n" },
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
  "n+n+n$": [
    { stack: "$0", input: "n+n+n$", action: "Shift 2" },
    { stack: "$0n2", input: "+n+n$", action: "Reduce E→n" },
    { stack: "$0E1", input: "+n+n$", action: "Shift 3" },
    { stack: "$0E1+3", input: "n+n$", action: "Shift 4" },
    { stack: "$0E1+3n4", input: "+n$", action: "Reduce E→n" }, 
    { stack: "$0E1+3E5", input: "+n$", action: "Reduce E→E+E" },
    { stack: "$0E1", input: "+n$", action: "Shift 3" }, 
    { stack: "$0E1+3", input: "n$", action: "Shift 4" },
    { stack: "$0E1+3n4", input: "$", action: "Reduce E→n" },
    { stack: "$0E1+3E5", input: "$", action: "Reduce E→E+E" },
    { stack: "$0E1", input: "$", action: "Accept" },
  ],
};

const lalr1ExampleSet: ExampleSet = {
  "ab$": [
    { stack: "$0", input: "ab$", action: "Shift a" },
    { stack: "$0aX", input: "b$", action: "Reduce A → a" }, 
    { stack: "$0AZ", input: "b$", action: "Shift b" },      
    { stack: "$0AZbW", input: "$", action: "Reduce B → b" }, 
    { stack: "$0AZBU", input: "$", action: "Reduce S → AB" },//
    { stack: "$0SP", input: "$", action: "Accept" }        
  ],
  "x=x$": [
    { stack: "$0", input: "x=x$", action: "Shift x (V)" },
    { stack: "$0x_V1", input: "=x$", action: "Reduce E → V" }, 
    { stack: "$0E2", input: "=x$", action: "Shift =" },
    { stack: "$0E2=3", input: "x$", action: "Shift x (V)" },
    { stack: "$0E2=3x_V4", input: "$", action: "Reduce E → V" }, 
    { stack: "$0E2=3E5", input: "$", action: "Reduce S → V = E" }, 
    { stack: "$0S_accept", input: "$", action: "Accept" }
  ]
};

const ll1ParsingExamples: ExampleOption[] = [
  { value: "a+a$", label: "LL(1): a+a$" }, 
  { value: "a$", label: "LL(1): a$" },
  { value: "(a)$", label: "LL(1): (a)$" },
  { value: "a*a$", label: "LL(1): a*a$" },
];

const slrParsingExamples: ExampleOption[] = [
  { value: "n+n$", label: "SLR(1): n+n$" },
  { value: "n$", label: "SLR(1): n$" },
  { value: "n+n+n$", label: "SLR(1): n+n+n$" },
];

const lalr1ParsingExamples: ExampleOption[] = [
  { value: "ab$", label: "LALR(1): ab$" },
  { value: "x=x$", label: "LALR(1): x=x$" },
];

export default function ParsingVisualizer({ type }: ParsingVisualizerProps) {
  const [selectedExample, setSelectedExample] = useState<string>(() => {
    let examples;
    let defaultExampleValue;
    if (type === "ll1") {
      examples = ll1ParsingExamples;
      defaultExampleValue = "a+a$";
    } else if (type === "slr1") {
      examples = slrParsingExamples;
      defaultExampleValue = "n+n$";
    } else { // lalr1
      examples = lalr1ParsingExamples;
      defaultExampleValue = "ab$";
    }
    return examples.length > 0 ? examples[0].value : defaultExampleValue;
  });

  const [inputString, setInputString] = useState<string>(selectedExample);
  const [currentStep, setCurrentStep] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [grammarInput, setGrammarInput] = useState<string>(
    type === "ll1"
    ? "E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | a"
    : "" // Default grammar for LL(1)
  );
  
  // --- START: State for LL(1) grammar parsing, FIRST/FOLLOW sets, and table ---
  const [parsedGrammar, setParsedGrammar] = useState<Grammar>({});
  const [firstSets, setFirstSets] = useState<FirstFollowSets>({});
  const [followSets, setFollowSets] = useState<FirstFollowSets>({});
  const [ll1ParsingTable, setLl1ParsingTable] = useState<LL1Table>({});
  const [terminals, setTerminals] = useState<Set<string>>(new Set()); // Shared for LL(1) and LALR(1) grammar parsing
  const [nonTerminals, setNonTerminals] = useState<Set<string>>(new Set()); // Shared
  const [startSymbol, setStartSymbol] = useState<string>(""); // Shared (original start symbol)
  const [ll1Error, setLl1Error] = useState<string | null>(null);
  // --- END: State for LL(1) ---

  // --- START: State for LALR(1) ---
  const [augmentedGrammar, setAugmentedGrammar] = useState<Grammar>({});
  const [canonicalCollectionLR1, setCanonicalCollectionLR1] = useState<CanonicalCollectionLR1>(new Map());
  const [lr1Transitions, setLr1Transitions] = useState<LR1Transitions>(new Map());
  // TODO: States for LALR1 merged states if I show them separately
  const [lalr1ParsingTable, setLalr1ParsingTable] = useState<LALR1ParsingTable>({ action: {}, goto: {} });
  const [lalr1Error, setLalr1Error] = useState<string | null>(null);
  // --- END: State for LALR(1) ---

  const slrTable: SLRTable = slrTableData; // SLR remains static for now

  const currentExampleSet: ExampleSet =
    // type === "ll1" ? ll1ExampleSet : // To be replaced by dynamic steps
    type === "slr1" ? slrExampleSet :
    lalr1ExampleSet; // Added LALR(1) case

  // const steps: ParsingStep[] = currentExampleSet[selectedExample] || []; // To be replaced
  // For LL(1), steps will be generated dynamically. For others, use existing logic.
  const [steps, setSteps] = useState<ParsingStep[]>([]);

  useEffect(() => {
    if (type === "ll1") {
      if (Object.keys(ll1ParsingTable).length > 0 && inputString && startSymbol && !ll1Error) {
        const newSteps = parseLL1Dynamic(inputString, ll1ParsingTable, startSymbol, nonTerminals);
        setSteps(newSteps);
      } else {
        setSteps([]);
      }
    } else if (type === "lalr1") {
      if (
        Object.keys(lalr1ParsingTable.action).length > 0 &&
        Object.keys(lalr1ParsingTable.goto).length > 0 &&
        inputString &&
        Object.keys(augmentedGrammar).length > 0 && // Ensure augmentedGrammar is populated
        startSymbol && // Original start symbol for augmented version
        !lalr1Error
      ) {
        const productionRulesList: {nt: string, body: string[]}[] = [];
        const augStartSymbol = startSymbol + "'";
        const ntListForRules = [augStartSymbol, ...Array.from(nonTerminals).filter(nt => nt !== augStartSymbol).sort()];
        ntListForRules.forEach(nt => {
            if (augmentedGrammar[nt]) {
                augmentedGrammar[nt].forEach(body => {
                    productionRulesList.push({ nt, body });
                });
            }
        });

        const newLALRSteps = parseLALR1Dynamic(
          inputString,
          lalr1ParsingTable,
          augmentedGrammar, // Pass the augmented grammar
          augStartSymbol,    // Pass the augmented start symbol S'
          productionRulesList,
          terminals,
          nonTerminals // Pass original non-terminals
        );
        setSteps(newLALRSteps);
      } else {
        setSteps([]); // Clear steps if table/grammar not ready
      }
    } else { // SLR
      setSteps(currentExampleSet[selectedExample] || []);
    }
  }, [
    type, inputString, grammarInput, selectedExample, currentExampleSet, 
    ll1ParsingTable, startSymbol, nonTerminals, ll1Error, // LL(1) deps
    lalr1ParsingTable, augmentedGrammar, lalr1Error, terminals // LALR(1) deps, added terminals
  ]);

  useEffect(() => {
    let examples;
    let defaultExampleValue;
    if (type === "ll1") {
      examples = ll1ParsingExamples;
      defaultExampleValue = "a+a$";
    } else if (type === "slr1") {
      examples = slrParsingExamples;
      defaultExampleValue = "n+n$";
    } else { // lalr1
      examples = lalr1ParsingExamples;
      defaultExampleValue = "ab$";
    }
    const newSelectedExample = examples.length > 0 ? examples[0].value : defaultExampleValue;
    setSelectedExample(newSelectedExample);
    setInputString(newSelectedExample); // Initialize input string with the default example
    setCurrentStep(0);
    setIsRunning(false);
    if (type === "ll1") {
      setGrammarInput("E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | a");
    } else {
      setGrammarInput(""); // Clear grammar for non-LL(1) types
    }
  }, [type]);

  useEffect(() => {
    setInputString(selectedExample);
    setCurrentStep(0);
    setIsRunning(false);
    // When example changes, if it's LL(1), we might want to re-parse.
    // This will be handled by the main steps useEffect.
  }, [selectedExample]);

  useEffect(() => {
    let timer: NodeJS.Timeout | number;
    if (isRunning && steps && steps.length > 0 && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep((prev: number) => prev + 1);
      }, 500);
    } else if (isRunning && currentStep >= steps.length - 1) {
      setIsRunning(false);
    }
    return () => clearTimeout(timer as number);
  }, [isRunning, currentStep, steps]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const reset = () => {
    setCurrentStep(0)
    setIsRunning(false)
    setInputString(selectedExample);
  }

  const runAll = () => {
    setCurrentStep(0)
    setIsRunning(true)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputString(newValue);
    const currentParserExamples = type === "ll1" ? ll1ParsingExamples : type === "slr1" ? slrParsingExamples : lalr1ParsingExamples;
    const matchingExample = currentParserExamples.find(ex => ex.value === newValue);
    if (matchingExample) {
      if (selectedExample !== newValue) {
         setSelectedExample(newValue);
      }
    } else {
      // If user types a custom string not in examples, reset steps (especially for LL1)
      setCurrentStep(0);
      setIsRunning(false);
      if (type === "ll1") setSteps([]); // Clear steps for custom input until parsing logic is complete
    }
  };

  const handleExampleChange = (value: string) => {
    if (selectedExample !== value) {
      setSelectedExample(value);
    }
  };
  
  const handleGrammarChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setGrammarInput(event.target.value);
    // TODO: Re-calculate FIRST/FOLLOW, Parsing Table, and Steps when grammar changes
    setCurrentStep(0);
    setIsRunning(false);
    setSteps([]);
  };

  const placeholderText = type === "ll1"
    ? "Try: a+a$, a$, (a)$, a*a$"
    : type === "slr1" ? "Try: n+n$, n$, n+n+n$" : "Try: ab$, x=x$";

  // TODO: Define types for FIRST, FOLLOW sets and ParsingTable
  // const [firstSets, setFirstSets] = useState<any>({}); // Replaced by typed state
  // const [followSets, setFollowSets] = useState<any>({}); // Replaced by typed state
  // const [ll1ParsingTable, setLl1ParsingTable] = useState<LL1Table>({}); // Replaced by typed state


  // --- START: LL(1) Parsing Algorithm ---
  const parseLL1Dynamic = (
    currentInput: string, 
    table: LL1Table, 
    grammarStartSymbol: string,
    grammarNonTerminals: Set<string>
  ): ParsingStep[] => {
    const generatedSteps: ParsingStep[] = [];
    if (!currentInput.endsWith("$")) currentInput += "$";
    
    let stack: string[] = ["$", grammarStartSymbol];
    let inputPtr = 0;
    let currentAction = "";

    // Max steps to prevent infinite loops from bad grammar
    let maxSteps = 200; 
    let stepCount = 0;

    while(stepCount++ < maxSteps) {
      const stackTop = stack[stack.length - 1];
      const currentInputSymbol = currentInput[inputPtr];

      generatedSteps.push({
        stack: stack.slice().reverse().join(""), // Show stack with top on left
        input: currentInput.substring(inputPtr),
        action: currentAction
      });
      currentAction = ""; // Reset action for next step record

      if (stackTop === "$" && currentInputSymbol === "$") {
        currentAction = "Accept";
        generatedSteps.push({ stack: "$", input: "$", action: currentAction });
        break;
      }
      if (stackTop === "$" || currentInputSymbol === undefined) { // Stack empty but input remains OR input exhausted but stack not
        currentAction = "Error: Unexpected end of stack or input";
        generatedSteps.push({ stack: stack.slice().reverse().join(""), input: currentInput.substring(inputPtr), action: currentAction });
        break;
      }

      if (grammarNonTerminals.has(stackTop)) { // Non-terminal on stack top
        const rule = table[stackTop]?.[currentInputSymbol];
        if (rule) {
          currentAction = `Predict: ${rule}`;
          stack.pop(); // Pop non-terminal
          const [_, rhsString] = rule.split("->");
          const rhsSymbols = rhsString.trim().split(/\s+/).filter(s => s);
          if (rhsSymbols[0] !== "ε") { // If not epsilon rule
            for (let i = rhsSymbols.length - 1; i >= 0; i--) {
              stack.push(rhsSymbols[i]);
            }
          }
        } else {
          currentAction = `Error: No rule in table M[${stackTop}, ${currentInputSymbol}]`;
          generatedSteps.push({ stack: stack.slice().reverse().join(""), input: currentInput.substring(inputPtr), action: currentAction });
          break;
        }
      } else { // Terminal on stack top
        if (stackTop === currentInputSymbol) {
          currentAction = `Match: ${currentInputSymbol}`;
          stack.pop();
          inputPtr++;
        } else {
          currentAction = `Error: Mismatch (Stack: ${stackTop}, Input: ${currentInputSymbol})`;
          generatedSteps.push({ stack: stack.slice().reverse().join(""), input: currentInput.substring(inputPtr), action: currentAction });
          break;
        }
      }
      if (stepCount === maxSteps -1) { // About to exceed maxSteps
         currentAction = "Error: Max parsing steps reached. Possible loop or complex parse.";
         generatedSteps.push({ stack: stack.slice().reverse().join(""), input: currentInput.substring(inputPtr), action: currentAction });
         break;
      }
    }
     // Remove the initial placeholder step action
    if (generatedSteps.length > 0) generatedSteps[0].action = "Initialize";
    return generatedSteps;
  };
  // --- END: LL(1) Parsing Algorithm ---


import { 
  parseGrammarFromString, 
  calculateFirstSetsInternal, 
  calculateFollowSetsInternal,
  constructLL1ParsingTableInternal
} from "./lib/parsing-algorithms"; // Import the new utility functions

// --- START: LL(1) Core Logic (Refactored to use utility functions) ---
useEffect(() => {
  if (type !== "ll1") {
    // Optionally clear LL(1) states if type changes away from LL(1)
    // This might be desired if grammarInput is not shared or should reset
    // setLl1Error(null); setParsedGrammar({}); setFirstSets({}); setFollowSets({}); 
    // setLl1ParsingTable({}); setTerminals(new Set()); setNonTerminals(new Set()); setStartSymbol("");
    return;
  }

  setLl1Error(null);
  setParsedGrammar({}); 
  setFirstSets({}); 
  setFollowSets({}); 
  setLl1ParsingTable({});
  setTerminals(new Set());
  setNonTerminals(new Set());
  setStartSymbol("");
  setSteps([]); // Clear previous steps

  const grammarResult = parseGrammarFromString(grammarInput);

  if (grammarResult.error) {
    setLl1Error(grammarResult.error);
    return;
  }
  if (Object.keys(grammarResult.parsedGrammar).length === 0 && !grammarInput.trim()) {
      // Empty grammar, valid, but nothing to process
      setTerminals(new Set(["$"])); // Ensure terminals has $ for table rendering
      return;
  }
   if (Object.keys(grammarResult.parsedGrammar).length === 0 && grammarInput.trim()) {
      // Parsing resulted in empty grammar but there was input, likely an issue.
      setLl1Error(grammarResult.error || "Failed to parse grammar: unknown error.");
      return;
  }


  setParsedGrammar(grammarResult.parsedGrammar);
  setNonTerminals(grammarResult.nonTerminals);
  setTerminals(grammarResult.terminals);
  setStartSymbol(grammarResult.startSymbol);

  const firstSetResult = calculateFirstSetsInternal(
    grammarResult.parsedGrammar, 
    grammarResult.nonTerminals, 
    grammarResult.terminals,
    // grammarResult.allSymbols // Potentially pass allSymbols if needed for epsilon handling
  );

  if (firstSetResult.error) {
    setLl1Error(firstSetResult.error);
    return;
  }
  setFirstSets(firstSetResult.firstSets);

  if (!grammarResult.startSymbol && Object.keys(grammarResult.parsedGrammar).length > 0) {
    setLl1Error("Start symbol could not be determined from the grammar.");
    return;
  }
  if (Object.keys(grammarResult.parsedGrammar).length === 0 && grammarInput.trim()) {
    // If grammar is empty after parsing but there was input, it's an error.
    // If grammarInput was also empty, it's not an error, just nothing to do.
    setLl1Error("Grammar parsed to empty, check input.");
    return;
  }


  const followSetResult = calculateFollowSetsInternal(
    grammarResult.parsedGrammar,
    grammarResult.nonTerminals,
    grammarResult.startSymbol,
    firstSetResult.firstSets
  );

  if (followSetResult.error) {
    setLl1Error(followSetResult.error);
    return;
  }
  setFollowSets(followSetResult.followSets);

  const ll1TableResult = constructLL1ParsingTableInternal(
    grammarResult.parsedGrammar,
    firstSetResult.firstSets,
    followSetResult.followSets,
    grammarResult.nonTerminals,
    grammarResult.terminals
  );

  if (ll1TableResult.error) {
    setLl1Error(ll1TableResult.error);
    // Set table and conflicts if they exist, even with an error
    setLl1ParsingTable(ll1TableResult.table);
    if(ll1TableResult.conflicts.length > 0) {
        setLl1Error(prev => prev ? `${prev}\nConflicts: ${ll1TableResult.conflicts.join('\n')}` : `Conflicts: ${ll1TableResult.conflicts.join('\n')}`);
    }
    return;
  }
  
  setLl1ParsingTable(ll1TableResult.table);
  if (ll1TableResult.conflicts.length > 0) {
    setLl1Error(`LL(1) Conflicts detected:\n${ll1TableResult.conflicts.join("\n")}`);
  }

}, [grammarInput, type]);
// --- END: LL(1) Core Logic ---

  // --- START: LALR(1) Core Logic ---
  useEffect(() => {
    if (type !== "lalr1") {
      // setLalr1Error(null);
      // setAugmentedGrammar({}); setCanonicalCollectionLR1(new Map()); setLr1Transitions(new Map());
      // setLalr1ParsingTable({ action: {}, goto: {} });
      return;
    }
    // Reset LALR(1) specific states
    setLalr1Error(null);
    setAugmentedGrammar({}); 
    setCanonicalCollectionLR1(new Map()); 
    setLr1Transitions(new Map());
    setLalr1ParsingTable({ action: {}, goto: {} });
    setCanonicalCollectionLR1(new Map());
    setLr1Transitions(new Map());
    
    if (!grammarInput.trim()) {
        setLalr1Error("LALR(1): 문법을 입력해주세요.");
        return;
    }

    try {
      // Ensure basic grammar data (nonTerminals, terminals, firstSets, startSymbol, parsedGrammar) is available
      // This data is set by the LL(1) useEffect. If it's not there, LALR(1) can't proceed.
      if (!startSymbol || Object.keys(parsedGrammar).length === 0 || Object.keys(firstSets).length === 0 || terminals.size === 0) {
          setLalr1Error("LALR(1): 기본 문법 분석 정보(파싱된 문법, FIRST 집합 등)가 필요합니다. LL(1) 탭을 먼저 방문하여 문법을 처리하거나, 문법 입력 후 잠시 기다려주세요.");
          return;
      }

      // 1. Augment Grammar
      const augmentedStartProdSymbol = startSymbol + "'"; 
      const currentAugmentedGrammar: Grammar = JSON.parse(JSON.stringify(parsedGrammar)); // Deep copy

      if (!currentAugmentedGrammar[augmentedStartProdSymbol] && startSymbol) {
         currentAugmentedGrammar[augmentedStartProdSymbol] = [[startSymbol]];
      } else if (!startSymbol) {
        throw new Error("LALR(1): 원본 시작 심볼을 찾을 수 없습니다.");
      }
      setAugmentedGrammar(currentAugmentedGrammar);
      
      const currentLalrNonTerminals = new Set(nonTerminals);
      currentLalrNonTerminals.add(augmentedStartProdSymbol);

      // 2. Build Canonical Collection of LR(1) Items
      const { itemSets: ccLR1, transitions: lr1Trans } = buildCanonicalCollectionLR1(
        currentAugmentedGrammar, 
        firstSets, 
        currentLalrNonTerminals, 
        terminals, // Pass terminals here
        augmentedStartProdSymbol
      );
      setCanonicalCollectionLR1(ccLR1);
      setLr1Transitions(lr1Trans);

      // TODO: 3. Merge LR(1) states to LALR(1) states
      // For now, we'll skip true LALR merging and treat CC_LR1 as LALR states for table construction.
      // This means we are essentially building an LR(1) table. True LALR merging is complex.
      // const { lalrStates, lalrTransitions } = mergeLR1StatesToLALR(ccLR1, lr1Trans);
      // setLalrStates(lalrStates);
      // setLalrTransitions(lalrTransitions);

      // 4. Construct LR(1) Parsing Table (acting as LALR(1) for now)
      if (ccLR1.size > 0) {
        const productionRulesList: {nt: string, body: string[]}[] = [];
        // Create a numbered list of productions from augmentedGrammar for reduce actions
        // Important: The order matters for rule numbers.
        // Iterate through non-terminals in a fixed order if possible (e.g., starting with augmented start, then others)
        const ntList = [augmentedStartProdSymbol, ...Array.from(currentLalrNonTerminals).filter(nt => nt !== augmentedStartProdSymbol).sort()];
        ntList.forEach(nt => {
            if (currentAugmentedGrammar[nt]) {
                currentAugmentedGrammar[nt].forEach(body => {
                    productionRulesList.push({ nt, body });
                });
            }
        });

        const table = constructLR1ParsingTable(
            ccLR1, 
            lr1Trans, 
            currentAugmentedGrammar, 
            currentLalrNonTerminals, 
            terminals, // This is the set of original terminals + '$'
            augmentedStartProdSymbol,
            productionRulesList
        );
        setLalr1ParsingTable(table);
      } else {
         setLalr1Error("LALR(1): LR(1) 상태 집합을 생성하지 못했습니다. 파싱 테이블을 만들 수 없습니다.");
         setLalr1ParsingTable({ action: {}, goto: {} }); // Reset table
      }


    } catch (e: any) {
      setLalr1Error(`LALR(1) 오류: ${e.message}` || "LALR(1) 처리 중 알 수 없는 오류 발생.");
      // Clear LALR(1) specific states
      setAugmentedGrammar({}); setCanonicalCollectionLR1(new Map()); setLr1Transitions(new Map());
      setLalr1ParsingTable({ action: {}, goto: {} });
      setSteps([]);
    }
  }, [grammarInput, type, parsedGrammar, firstSets, nonTerminals, startSymbol]); // Dependencies
  // --- END: LALR(1) Core Logic ---

  // --- START: LR(1) Item, Closure, Goto, Canonical Collection Logic ---

  // Helper to stringify LR(1) item: [A -> α . β, a]
  const lr1ItemToString = (nt: string, prod: string[], dotPos: number, lookahead: string): LR1ItemString => {
    const rhs = [...prod.slice(0, dotPos), ".", ...prod.slice(dotPos)].join(" ");
    return `[${nt} -> ${rhs}, ${lookahead}]`;
  };

  // Helper to parse LR(1) item string
  const stringToLR1Item = (itemStr: LR1ItemString): {nt: string, ruleBody: string[], dot: number, lookahead: string} | null => {
    const match = itemStr.match(/^\[(\w+'*) -> (.*), (\S+)\]$/);
    if (!match) return null;
    const nt = match[1];
    const bodyWithDot = match[2];
    const lookahead = match[3];
    const symbols = bodyWithDot.split(/\s+/);
    const dot = symbols.indexOf(".");
    if (dot === -1) return null;
    const ruleBody = symbols.filter(s => s !== ".");
    return { nt, ruleBody, dot, lookahead };
  };
  
  // Helper to compute FIRST set of a sequence of symbols α (e.g., βa from LR(1) closure)
  const computeFirstOfSequence = (
    sequence: string[], // e.g. [X, Y, z] or [a] for lookahead part
    currentFirstSets: FirstFollowSets,
    currentTerminals: Set<string>
  ): Set<string> => {
    const result = new Set<string>();
    let allPreviousDeriveEpsilon = true;
    for (const sym of sequence) {
      if (currentTerminals.has(sym)) {
        result.add(sym);
        allPreviousDeriveEpsilon = false;
        break;
      }
      if (currentFirstSets[sym]) {
        currentFirstSets[sym].forEach(f => { if (f !== "ε") result.add(f); });
        if (!currentFirstSets[sym].has("ε")) {
          allPreviousDeriveEpsilon = false;
          break;
        }
      } else if (sym === "ε") { // sequence can be just ["ε"]
        // continue, epsilon doesn't break the chain here
      } else { // Symbol not in firstSets (could be an issue or end of sequence)
        allPreviousDeriveEpsilon = false; 
        break;
      }
    }
    if (allPreviousDeriveEpsilon) result.add("ε");
    return result;
  };


  const lr1Closure = (
    kernelItems: LR1ItemSet, // Set of LR1ItemString
    currentAugmentedGrammar: Grammar,
    currentFirstSets: FirstFollowSets,
    currentLalrNonTerminals: Set<string>,
    currentTerminals: Set<string>
  ): LR1ItemSet => {
    const closureSet = new Set<LR1ItemString>(kernelItems);
    let changed = true;
    while (changed) {
      changed = false;
      const itemsToAdd: LR1ItemString[] = [];
      closureSet.forEach(itemStr => {
        const item = stringToLR1Item(itemStr);
        if (!item) return;
        const { nt: A, ruleBody: alphaBeta, dot: dotPosition, lookahead: a } = item;
        
        if (dotPosition < alphaBeta.length) {
          const B = alphaBeta[dotPosition]; // Symbol B after dot
          if (currentLalrNonTerminals.has(B) && currentAugmentedGrammar[B]) {
            const beta = alphaBeta.slice(dotPosition + 1); // Sequence beta after B
            const firstOfBetaA = computeFirstOfSequence([...beta, a], currentFirstSets, currentTerminals);

            currentAugmentedGrammar[B].forEach(gammaRule => { // For each B -> gamma
              firstOfBetaA.forEach(b => { // For each terminal b in FIRST(beta + a)
                if (b === "ε" && a !== "$") return; // Avoid adding epsilon lookahead unless it's from $
                const newItemStr = lr1ItemToString(B, gammaRule, 0, b === "ε" ? a : b);
                if (!closureSet.has(newItemStr)) {
                  itemsToAdd.push(newItemStr);
                }
              });
            });
          }
        }
      });
      if (itemsToAdd.length > 0) {
        itemsToAdd.forEach(i => closureSet.add(i));
        changed = true;
      }
    }
    return closureSet;
  };

  const lr1Goto = (
    itemSet: LR1ItemSet, // Set of LR1ItemString
    X: string, // Grammar symbol
    currentAugmentedGrammar: Grammar,
    currentFirstSets: FirstFollowSets,
    currentLalrNonTerminals: Set<string>,
    currentTerminals: Set<string>
  ): LR1ItemSet => {
    const newKernelItems = new Set<LR1ItemString>();
    itemSet.forEach(itemStr => {
      const item = stringToLR1Item(itemStr);
      if (!item) return;
      const { nt, ruleBody, dot, lookahead } = item;
      if (dot < ruleBody.length && ruleBody[dot] === X) {
        newKernelItems.add(lr1ItemToString(nt, ruleBody, dot + 1, lookahead));
      }
    });
    if (newKernelItems.size === 0) return new Set();
    return lr1Closure(newKernelItems, currentAugmentedGrammar, currentFirstSets, currentLalrNonTerminals, currentTerminals);
  };
  
  const buildCanonicalCollectionLR1 = (
    currentAugmentedGrammar: Grammar,
    currentFirstSets: FirstFollowSets,
    currentLalrNonTerminals: Set<string>,
    currentTerminals: Set<string>, // Pass actual terminals
    augStartSymbol: string
  ): { itemSets: CanonicalCollectionLR1; transitions: LR1Transitions } => {
    const cc: CanonicalCollectionLR1 = new Map();
    const trans: LR1Transitions = new Map();
    const stateLookup: Map<string, number> = new Map(); // For finding existing states by stringified item set

    const initialRule = currentAugmentedGrammar[augStartSymbol]?.[0];
    if (!initialRule) throw new Error("Augmented start symbol production not found.");
    
    const initialStateKernel = new Set([lr1ItemToString(augStartSymbol, initialRule, 0, "$")]);
    const initialState = lr1Closure(initialStateKernel, currentAugmentedGrammar, currentFirstSets, currentLalrNonTerminals, currentTerminals);

    let stateIdCounter = 0;
    cc.set(stateIdCounter, initialState);
    stateLookup.set(Array.from(initialState).sort().join("|"), stateIdCounter); // Key for lookup
    const queue = [stateIdCounter]; // States to process
    trans.set(stateIdCounter, new Map());

    const allGrammarSymbols = new Set([...currentLalrNonTerminals, ...currentTerminals].filter(s => s !== "ε" && s !== "$"));


    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentItemSet = cc.get(currentId)!;

      allGrammarSymbols.forEach(X => {
        const gotoResult = lr1Goto(currentItemSet, X, currentAugmentedGrammar, currentFirstSets, currentLalrNonTerminals, currentTerminals);
        if (gotoResult.size === 0) return;

        const gotoSetStr = Array.from(gotoResult).sort().join("|");
        let nextStateId = stateLookup.get(gotoSetStr);

        if (nextStateId === undefined) {
          stateIdCounter++;
          nextStateId = stateIdCounter;
          cc.set(nextStateId, gotoResult);
          stateLookup.set(gotoSetStr, nextStateId);
          queue.push(nextStateId);
          trans.set(nextStateId, new Map());
        }
        trans.get(currentId)!.set(X, nextStateId);
      });
    }
    return { itemSets: cc, transitions: trans };
  };

  // --- END: LR(1) Item, Closure, Goto, Canonical Collection Logic ---

  // --- START: LR(1) Parsing Table Construction ---
  const constructLR1ParsingTable = (
    lr1ItemSets: CanonicalCollectionLR1,
    lr1TransitionsMap: LR1Transitions,
    currentAugmentedGrammar: Grammar,
    currentLalrNonTerminals: Set<string>,
    grammarTerminals: Set<string>, // Original terminals + '$'
    augmentedStartProd: string,
    grammarProductionRules: {nt: string, body: string[]}[] // Numbered list of productions
  ): LALR1ParsingTable => {
    const actionTable: LALR1ParsingTable['action'] = {};
    const gotoTable: LALR1ParsingTable['goto'] = {};

    for (const [stateId, itemSet] of lr1ItemSets.entries()) {
      actionTable[stateId] = {};
      gotoTable[stateId] = {};

      // Transitions for GOTO table (non-terminals) and SHIFT actions (terminals)
      const stateTransitions = lr1TransitionsMap.get(stateId);
      if (stateTransitions) {
        stateTransitions.forEach((targetStateId, symbol) => {
          if (currentLalrNonTerminals.has(symbol)) {
            gotoTable[stateId][symbol] = targetStateId;
          } else if (grammarTerminals.has(symbol)) { // Terminals (excluding '$' initially for shift)
            if (actionTable[stateId][symbol] && actionTable[stateId][symbol] !== `s${targetStateId}`) {
              throw new Error(`LALR(1) 충돌: 상태 ${stateId}, 심볼 ${symbol} Shift/Shift 충돌 (${actionTable[stateId][symbol]} vs s${targetStateId}). 이것은 발생해서는 안됩니다.`);
            }
            actionTable[stateId][symbol] = `s${targetStateId}`;
          }
        });
      }
      
      // REDUCE and ACCEPT actions
      itemSet.forEach(itemStr => {
        const item = stringToLR1Item(itemStr);
        if (!item) return;
        const { nt: A, ruleBody: alpha, dot: dotPosition, lookahead: lookaheadTerminal } = item;

        if (dotPosition === alpha.length || (alpha.length === 1 && alpha[0] === "ε") ) { // Dot is at the end or rule is A -> .ε
          if (A === augmentedStartProd && !(alpha.length === 1 && alpha[0] === "ε")) { // Accept: S' -> S .
            if (actionTable[stateId][lookaheadTerminal] && actionTable[stateId][lookaheadTerminal] !== 'acc') {
              throw new Error(`LALR(1) 충돌: 상태 ${stateId}, 심볼 ${lookaheadTerminal} (${actionTable[stateId][lookaheadTerminal]} vs acc).`);
            }
            actionTable[stateId][lookaheadTerminal] = 'acc';
          } else { // Reduce A -> alpha
            // Find rule number (1-indexed)
            let ruleNumber = -1;
            const currentRuleBody = (alpha.length === 1 && alpha[0] === "ε") ? ["ε"] : alpha;
            for(let i=0; i < grammarProductionRules.length; i++) {
                const prod = grammarProductionRules[i];
                if(prod.nt === A && prod.body.length === currentRuleBody.length && prod.body.every((val, idx) => val === currentRuleBody[idx])) {
                    ruleNumber = i + 1;
                    break;
                }
            }

            if (ruleNumber === -1) {
              // This case (A -> .ε, a) might mean A is the augmented start symbol, which is not a typical reduce.
              // For S' -> .ε, a (if such a rule existed), it wouldn't be a standard reduce.
              // Only reduce non-augmented rules.
              if (A !== augmentedStartProd || (A === augmentedStartProd && alpha.length === 1 && alpha[0] === "ε" )) { // Check if it's not S' -> S
                 // console.warn(`Rule not found for reduction: ${A} -> ${alpha.join(" ")}`);
                 // This can happen for S' -> .ε if ε is empty list, but it's not a reduction.
                 // If alpha is ["ε"], it's an epsilon reduction.
                 if (!(alpha.length === 1 && alpha[0] === "ε" && A === augmentedStartProd)) { // S' -> ε is not a standard reduction
                    // throw new Error(`Rule not found for reduction: ${A} -> ${alpha.join(" ")}`);
                 }
              }
            }
            
            if (ruleNumber !== -1 && A !== augmentedStartProd) { // Do not reduce by S' -> S
                const reduceAction = `r${ruleNumber}`;
                if (actionTable[stateId][lookaheadTerminal] && actionTable[stateId][lookaheadTerminal] !== reduceAction) {
                  throw new Error(`LALR(1) 충돌: 상태 ${stateId}, 심볼 ${lookaheadTerminal} (${actionTable[stateId][lookaheadTerminal]} vs ${reduceAction}).`);
                }
                actionTable[stateId][lookaheadTerminal] = reduceAction;
            }
          }
        }
      });
    }
    return { action: actionTable, goto: gotoTable };
  };
  // --- END: LR(1) Parsing Table Construction ---

  // --- START: LALR(1) Parsing Algorithm ---
  const parseLALR1Dynamic = (
    currentInput: string,
    table: LALR1ParsingTable,
    currentAugmentedGrammar: Grammar, // Used for rule details in reduce
    augStartSymbol: string, // e.g. S'
    productionRules: {nt: string, body: string[]}[], // Numbered list of productions
    grammarTerminals: Set<string>,
    grammarNonTerminals: Set<string>
  ): ParsingStep[] => {
    const generatedSteps: ParsingStep[] = [];
    let input = currentInput.endsWith("$") ? currentInput : currentInput + "$";
    
    let stack: (string | number)[] = [0]; // Stack of states (numbers) and symbols (strings)
    let inputPtr = 0;
    let currentActionLog = "Initialize"; // Initial action for the first step

    const maxSteps = 200;
    let stepCount = 0;

    while(stepCount++ < maxSteps) {
      generatedSteps.push({
        stack: stack.join(" "),
        input: input.substring(inputPtr),
        action: currentActionLog
      });

      const currentState = stack[stack.length - 1] as number;
      const currentInputSymbol = input[inputPtr];

      if (!table.action[currentState] || !table.action[currentState][currentInputSymbol]) {
        currentActionLog = `Error: No action for state ${currentState} and input ${currentInputSymbol}`;
        generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
        break;
      }

      const action = table.action[currentState][currentInputSymbol];
      currentActionLog = action; // Log this action for the *next* step's display

      if (action.startsWith("s")) { // Shift
        const targetState = parseInt(action.substring(1));
        stack.push(currentInputSymbol);
        stack.push(targetState);
        inputPtr++;
        currentActionLog = `Shift ${currentInputSymbol}, Goto state ${targetState}`;
      } else if (action.startsWith("r")) { // Reduce
        const ruleNumber = parseInt(action.substring(1));
        const ruleToReduce = productionRules[ruleNumber - 1]; // 0-indexed list vs 1-indexed rule
        if (!ruleToReduce) {
            currentActionLog = `Error: Invalid rule number ${ruleNumber} for reduce.`;
            generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
            break;
        }
        const { nt: A, body: beta } = ruleToReduce;
        const popCount = beta[0] === "ε" ? 0 : beta.length * 2; // Each symbol and its state
        
        for (let i = 0; i < popCount; i++) stack.pop();
        
        const stateBeforeReduce = stack[stack.length - 1] as number;
        stack.push(A); // Push the non-terminal
        
        if (!table.goto[stateBeforeReduce] || table.goto[stateBeforeReduce][A] === undefined) {
            currentActionLog = `Error: No GOTO for state ${stateBeforeReduce} and non-terminal ${A}`;
            generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
            break;
        }
        const nextState = table.goto[stateBeforeReduce][A];
        stack.push(nextState);
        currentActionLog = `Reduce by ${A} -> ${beta.join(" ")} (Rule ${ruleNumber}), Goto state ${nextState}`;

      } else if (action === "acc") { // Accept
        currentActionLog = "Accept";
        // Push final accept step before breaking
        generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
        break;
      } else {
        currentActionLog = `Error: Unknown action '${action}'`;
        generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
        break;
      }
      if (stepCount >= maxSteps -1 ) {
         currentActionLog = "Error: Max parsing steps reached.";
         generatedSteps.push({ stack: stack.join(" "), input: input.substring(inputPtr), action: currentActionLog });
         break;
      }
    }
    return generatedSteps;
  };
  // --- END: LALR(1) Parsing Algorithm ---


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{type === "ll1" ? "LL(1) 파싱 시뮬레이터" : type === "slr1" ? "SLR(1) 파싱 시뮬레이터" : "LALR(1) 파싱 시뮬레이터"}</CardTitle>
          <CardDescription>
            {type === "ll1" ? "하향식 파싱 과정을 단계별로 시각화합니다. 문법을 입력하고 파싱 과정을 살펴보세요." : type === "slr1" ? "상향식 파싱 과정을 단계별로 시각화합니다" : "상향식 파싱 과정을 단계별로 시각화합니다"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            {ll1Error && type === 'll1' && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800" role="alert">
              <span className="font-medium">문법/파싱 오류:</span> {ll1Error}
            </div>
          )}
          {/* Input Configuration Section */}
          <div className="grid md:grid-cols-2 gap-6 items-start">
            {/* Left Column: Input String & Example Selector */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input" className="text-sm font-medium">
                  입력 문자열 ({type.toUpperCase()})
                </Label>
                <Input id="input" value={inputString} onChange={handleInputChange} placeholder={placeholderText} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="example-select" className="text-sm font-medium">
                  예제 선택 (입력 문자열)
                </Label>
                <Select onValueChange={handleExampleChange} value={selectedExample}>
                  <SelectTrigger id="example-select">
                    <SelectValue placeholder="예제 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {(type === "ll1" ? ll1ParsingExamples :
                       type === "slr1" ? slrParsingExamples :
                       lalr1ParsingExamples).map((example) => (
                      <SelectItem key={example.value} value={example.value}>
                        {example.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column: Grammar Input (LL(1) only) & Controls */}
            <div className="space-y-4">
              {type === "ll1" && (
                <div className="space-y-2">
                  <Label htmlFor="grammar-input" className="text-sm font-medium">
                    LL(1) 문법 (한 줄에 하나의 생성 규칙, 예: S -&gt; A B | c)
                  </Label>
                  <Textarea
                    id="grammar-input"
                    value={grammarInput}
                    onChange={handleGrammarChange}
                    placeholder="E -> T E'\nE' -> + T E' | ε\nT -> F T'\nT' -> * F T' | ε\nF -> ( E ) | a"
                    className="h-32 font-mono text-sm"
                  />
                </div>
              )}
              <div className="flex items-end gap-2 pt-2"> {/* Adjusted for alignment */}
                <Button onClick={runAll} disabled={isRunning || (type === "ll1" && steps.length === 0) } className="flex items-center">
                  <Play className="h-4 w-4 mr-2" />
                  자동 실행
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  초기화
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs for Parsing Table, Trace, etc. */}
          {type === "ll1" ? (
            <Tabs defaultValue="trace" className="space-y-4 pt-4">
              <TabsList>
                <TabsTrigger value="grammar">LL(1) 문법 & FIRST/FOLLOW</TabsTrigger>
                <TabsTrigger value="table">LL(1) 파싱 테이블</TabsTrigger>
                <TabsTrigger value="trace">LL(1) 파싱 추적</TabsTrigger>
              </TabsList>
              <TabsContent value="grammar"> {/* LL(1) Grammar and First/Follow Sets */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">LL(1) 문법 명세 & FIRST/FOLLOW 집합</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">입력된 문법 (원본 시작 심볼: {startSymbol || "N/A"}):</h3>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm min-h-[60px] max-h-48 overflow-y-auto">
                        {Object.entries(parsedGrammar).length > 0 
                          ? Object.entries(parsedGrammar).map(([nt, prods]) => 
                              `${nt} -> ${prods.map(p => p.join(" ")).join(" | ")}`
                            ).join("\n") 
                          : grammarInput.trim() ? "문법 파싱 중 오류가 발생했거나 비어 있습니다." : "문법을 입력하세요."}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">FIRST Sets:</h3>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm min-h-[60px] max-h-48 overflow-y-auto">
                        {Object.keys(firstSets).length > 0 && Object.keys(parsedGrammar).length > 0
                          ? Array.from(nonTerminals).sort().map(nt => 
                              `${nt}: { ${Array.from(firstSets[nt] || new Set()).sort().join(", ")} }`
                            ).join("\n")
                          : "FIRST 집합이 여기에 표시됩니다."}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">FOLLOW Sets:</h3>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm min-h-[60px] max-h-48 overflow-y-auto">
                        {Object.keys(followSets).length > 0 && Object.keys(parsedGrammar).length > 0
                          ? Array.from(nonTerminals).sort().map(nt => 
                              `${nt}: { ${Array.from(followSets[nt] || new Set()).sort().join(", ")} }`
                            ).join("\n")
                          : "FOLLOW 집합이 여기에 표시됩니다."}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="table">
                <Card>
                  <CardHeader><CardTitle className="text-lg">LL(1) 파싱 테이블</CardTitle></CardHeader>
                  <CardContent>
                    {Object.keys(ll1ParsingTable).length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2 border-r dark:border-gray-600">M</th>
                                {Array.from(terminals).filter(t => t !== 'ε').sort().map(t => <th key={t} className="text-center p-2">{t}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(nonTerminals).sort().map(nt => (
                                <tr key={nt} className="border-b dark:border-gray-700">
                                  <td className="p-2 border-r dark:border-gray-600 font-medium">{nt}</td>
                                  {Array.from(terminals).filter(t => t !== 'ε').sort().map(term => (
                                    <td key={term} className="p-2 text-xs text-center">
                                      {ll1ParsingTable[nt]?.[term] || ""}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p>
                          {grammarInput.trim() && !ll1Error && Object.keys(parsedGrammar).length > 0 ? "파싱 테이블 생성 중... (다음 단계에서 구현)" : 
                           ll1Error ? `오류: ${ll1Error}` :
                           !grammarInput.trim() ? "먼저 문법을 입력해주세요." :
                           Object.keys(parsedGrammar).length === 0 && grammarInput.trim() ? "문법 파싱 오류로 테이블을 생성할 수 없습니다." :
                           "파싱 테이블이 여기에 표시됩니다."}
                        </p>
                      )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trace"> {/* LL(1) Trace */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">LL(1) 파싱 과정 추적</CardTitle>
                    <CardDescription>단계 {currentStep + 1} / {steps && type === 'll1' ? steps.length : 0}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {steps && steps.length > 0 && type === 'll1' ? (
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><span className="font-medium">스택:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.stack || "N/A"}</div></div>
                          <div><span className="font-medium">입력:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.input || "N/A"}</div></div>
                          <div><span className="font-medium">동작:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.action || "N/A"}</div></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">
                        {type === 'll1' && (!grammarInput.trim() ? "먼저 문법을 입력해주세요." :
                         ll1Error ? `LL(1) 오류: ${ll1Error}` :
                         Object.keys(parsedGrammar).length === 0 && grammarInput.trim() ? "LL(1) 문법 파싱 오류." :
                         Object.keys(ll1ParsingTable).length === 0 && grammarInput.trim() && !ll1Error && Object.keys(parsedGrammar).length > 0 ? "LL(1) 파싱 테이블 생성 오류." :
                         Object.keys(ll1ParsingTable).length > 0 ? "입력 문자열을 넣고 '자동 실행'을 눌러주세요." :
                         "LL(1) 파싱 단계를 보려면 문법 및 입력을 확인하세요.")
                        }
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={prevStep} disabled={currentStep === 0  || (type === 'll1' && (!steps || steps.length === 0))} variant="outline" size="sm">이전 단계</Button>
                      <Button onClick={nextStep} disabled={type === 'll1' && (!steps || steps.length === 0 || currentStep === steps.length - 1)} size="sm">다음 단계 <ArrowRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                    {steps && steps.length > 0 && type === 'll1' && (
                      <div className="overflow-x-auto max-h-96"> {/* Added max-h-96 for scroll on trace table */}
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="border-b"><th className="text-left p-2">단계</th><th className="text-left p-2">스택</th><th className="text-left p-2">입력</th><th className="text-left p-2">동작</th></tr>
                          </thead>
                          <tbody>
                            {steps.map((step, index) => (
                              <tr key={index} className={`border-b dark:border-gray-700 ${index === currentStep ? "bg-blue-100 dark:bg-blue-900/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                                <td className="p-2 font-medium">{index + 1}</td><td className="p-2 font-mono">{step.stack}</td><td className="p-2 font-mono">{step.input}</td><td className="p-2 whitespace-nowrap">{step.action}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            // Tabs for LALR(1)
            </Tabs>
          ) : type === "lalr1" ? (
            <Tabs defaultValue="trace" className="space-y-4 pt-4">
              <TabsList>
                <TabsTrigger value="grammar">LALR(1) 문법</TabsTrigger>
                <TabsTrigger value="states">LALR(1) 상태 (항목 집합)</TabsTrigger>
                <TabsTrigger value="table">LALR(1) 파싱 테이블</TabsTrigger>
                <TabsTrigger value="trace">LALR(1) 파싱 추적</TabsTrigger>
              </TabsList>
              <TabsContent value="grammar">
                <Card>
                  <CardHeader><CardTitle className="text-lg">LALR(1) 문법 및 증강 문법</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     <div>
                      <h3 className="font-semibold mb-2">원본 문법 (시작 심볼: {startSymbol || "N/A"}):</h3>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm min-h-[60px] max-h-48 overflow-y-auto">
                        {Object.entries(parsedGrammar).length > 0 
                          ? Object.entries(parsedGrammar).filter(([nt]) => nt !== startSymbol + "'").map(([nt, prods]) => 
                              `${nt} -> ${prods.map(p => p.join(" ")).join(" | ")}`
                            ).join("\n") 
                          : grammarInput.trim() ? "문법 파싱 중..." : "문법을 입력하세요."}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">증강된 문법 (시작 심볼: {startSymbol ? startSymbol + "'" : "N/A"}):</h3>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm min-h-[60px] max-h-48 overflow-y-auto">
                        {Object.entries(augmentedGrammar).length > 0 
                          ? Object.entries(augmentedGrammar).map(([nt, prods]) => 
                              `${nt} -> ${prods.map(p => p.join(" ")).join(" | ")}`
                            ).join("\n") 
                          : "증강 문법 생성 중..."}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="states">
                <Card>
                  <CardHeader><CardTitle className="text-lg">LALR(1) 상태 (항목 집합)</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto max-h-96">
                    {canonicalCollectionLR1.size > 0 ? (
                      Array.from(canonicalCollectionLR1.entries()).map(([stateId, itemSet]) => (
                        <div key={stateId} className="mb-3 p-2 border rounded">
                          <h4 className="font-semibold">상태 {stateId}:</h4>
                          <pre className="text-xs">
                            {Array.from(itemSet).map(item => `${item}`).join("\n")}
                          </pre>
                           {/* TODO: Display transitions from this state */}
                        </div>
                      ))
                    ) : <p>LALR(1) 상태 생성 중이거나 오류 발생.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="table">
                 <Card>
                  <CardHeader><CardTitle className="text-lg">LALR(1) 파싱 테이블</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    {Object.keys(lalr1ParsingTable.action).length > 0 ? (
                      <>
                        <h4 className="font-semibold mb-1">ACTION 테이블</h4>
                        {/* Placeholder for LALR(1) Action Table display */}
                        <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded">
                           {JSON.stringify(lalr1ParsingTable.action, null, 2)}
                        </pre>
                        <h4 className="font-semibold mt-3 mb-1">GOTO 테이블</h4>
                        {/* Placeholder for LALR(1) Goto Table display */}
                         <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 rounded">
                           {JSON.stringify(lalr1ParsingTable.goto, null, 2)}
                        </pre>
                      </>
                    ) : <p>LALR(1) 파싱 테이블 생성 중이거나 오류 발생.</p>}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trace"> {/* LALR(1) Trace */}
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">LALR(1) 파싱 과정 추적</CardTitle>
                    <CardDescription>단계 {currentStep + 1} / {steps && type === 'lalr1' ? steps.length : 0}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {steps && steps.length > 0 && type === 'lalr1' ? (
                       <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><span className="font-medium">스택:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.stack || "N/A"}</div></div>
                          <div><span className="font-medium">입력:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.input || "N/A"}</div></div>
                          <div><span className="font-medium">동작:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1 h-10 overflow-y-auto">{steps[currentStep]?.action || "N/A"}</div></div>
                        </div>
                      </div>
                    ) : (
                       <p className="text-gray-500 dark:text-gray-400">
                        {type === 'lalr1' && (!grammarInput.trim() ? "먼저 문법을 입력해주세요." :
                         lalr1Error ? `LALR(1) 오류: ${lalr1Error}` :
                         Object.keys(lalr1ParsingTable.action).length === 0 && grammarInput.trim() ? "LALR(1) 파싱 테이블 생성 오류." :
                         "LALR(1) 파싱 단계를 보려면 문법 및 입력을 확인하세요.")
                        }
                      </p>
                    )}
                     <div className="flex gap-2">
                      <Button onClick={prevStep} disabled={currentStep === 0 || (type === 'lalr1' && (!steps || steps.length === 0))} variant="outline" size="sm">이전 단계</Button>
                      <Button onClick={nextStep} disabled={type === 'lalr1' && (!steps || steps.length === 0 || currentStep === steps.length - 1)} size="sm">다음 단계 <ArrowRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                    {steps && steps.length > 0 && type === 'lalr1' && (
                       <div className="overflow-x-auto max-h-96">
                        <table className="w-full text-sm border-collapse">
                          <thead><tr className="border-b"><th className="text-left p-2">단계</th><th className="text-left p-2">스택</th><th className="text-left p-2">입력</th><th className="text-left p-2">동작</th></tr></thead>
                          <tbody>
                            {steps.map((step, index) => (
                              <tr key={index} className={`border-b dark:border-gray-700 ${index === currentStep ? "bg-blue-100 dark:bg-blue-900/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                                <td className="p-2 font-medium">{index + 1}</td><td className="p-2 font-mono">{step.stack}</td><td className="p-2 font-mono">{step.input}</td><td className="p-2 whitespace-nowrap">{step.action}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : ( // SLR(1) or other types
            <Tabs defaultValue="table" className="space-y-4 pt-4">
              <TabsList>
                <TabsTrigger value="table">SLR(1) 파싱 테이블</TabsTrigger>
                <TabsTrigger value="trace">SLR(1) 파싱 추적</TabsTrigger>
              </TabsList>
              <TabsContent value="table"> {/* SLR Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      SLR(1) 파싱 테이블 {/* Fallback for non-LL1, non-LALR1 */}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {type === "slr1" ? ( // Original SLR table display
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          {/* ... SLR table content ... */}
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 border-r">상태</th>
                              <th className="text-left p-2">n</th>
                              <th className="text-left p-2">+</th>
                              <th className="text-left p-2">$</th>
                              <th className="text-left p-2 border-l">E</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">0</td>
                              <td className="p-2">s2</td>
                              <td className="p-2"></td>
                              <td className="p-2"></td>
                              <td className="p-2 border-l">1</td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">1</td>
                              <td className="p-2"></td>
                              <td className="p-2">s3</td>
                              <td className="p-2">accept</td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">2</td>
                              <td className="p-2">r2</td>
                              <td className="p-2">r2</td>
                              <td className="p-2">r2</td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">3</td>
                              <td className="p-2">s4</td>
                              <td className="p-2"></td>
                              <td className="p-2"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">4</td>
                              <td className="p-2">r1</td>
                              <td className="p-2">r1</td>
                              <td className="p-2">r1</td>
                              <td className="p-2 border-l"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : ( // LALR(1) Table (Placeholder)
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          {/* ... LALR table content ... */}
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 border-r">상태</th>
                              <th className="text-left p-2">a</th>
                              <th className="text-left p-2">b</th>
                              <th className="text-left p-2">$</th>
                              <th className="text-left p-2 border-l">A</th>
                              <th className="text-left p-2 border-l">B</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">0</td>
                              <td className="p-2">sX</td>
                              <td className="p-2"></td>
                              <td className="p-2"></td>
                              <td className="p-2 border-l"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">X</td>
                              <td className="p-2"></td>
                              <td className="p-2">sW</td>
                              <td className="p-2">rA</td>
                              <td className="p-2 border-l"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">W</td>
                              <td className="p-2"></td>
                              <td className="p-2"></td>
                              <td className="p-2">rB</td>
                              <td className="p-2 border-l"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">Z</td>
                              <td className="p-2"></td>
                              <td className="p-2">sU</td>
                              <td className="p-2"></td>
                              <td className="p-2 border-l"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                            <tr className="border-b">
                              <td className="p-2 border-r font-medium">U</td>
                              <td className="p-2"></td>
                              <td className="p-2"></td>
                              <td className="p-2">rS</td>
                              <td className="p-2 border-l"></td>
                              <td className="p-2 border-l"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trace">
                 {/* This is the trace content for SLR/LALR - it references `steps` which is fine */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">파싱 과정 추적</CardTitle>
                    <CardDescription>
                      단계 {currentStep + 1} / {steps ? steps.length : 0}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {steps && steps.length > 0 ? (
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><span className="font-medium">스택:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.stack || "N/A"}</div></div>
                          <div><span className="font-medium">입력:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.input || "N/A"}</div></div>
                          <div><span className="font-medium">동작:</span><div className="font-mono bg-white dark:bg-gray-800 p-2 rounded mt-1">{steps[currentStep]?.action || "N/A"}</div></div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">선택된 예제에 대한 파싱 단계가 없거나, 현재 입력 문자열에 해당하는 예제가 없습니다.</p>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={prevStep} disabled={currentStep === 0} variant="outline" size="sm">이전 단계</Button>
                      <Button onClick={nextStep} disabled={!steps || currentStep === steps.length - 1} size="sm">다음 단계 <ArrowRight className="h-4 w-4 ml-1" /></Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b"><th className="text-left p-2">단계</th><th className="text-left p-2">스택</th><th className="text-left p-2">입력</th><th className="text-left p-2">동작</th></tr>
                        </thead>
                        <tbody>
                          {steps && steps.map((step, index) => (
                            <tr key={index} className={`border-b dark:border-gray-700 ${index === currentStep ? "bg-blue-100 dark:bg-blue-900/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                              <td className="p-2 font-medium">{index + 1}</td><td className="p-2 font-mono">{step.stack}</td><td className="p-2 font-mono">{step.input}</td><td className="p-2 whitespace-nowrap">{step.action}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
