import { LL1Table, SLRTable, ExampleSet } from "./parsing-algorithms";

export const ll1TableData: LL1Table = {
  E: { a: "E → TE'", "(": "E → TE'" },
  "E'": { "+": "E' → +TE'", ")": "E' → ε", "$": "E' → ε" },
  T: { a: "T → FT'", "(": "T → FT'" },
  "T'": { "+": "T' → ε", "*": "T' → *FT'", ")": "T' → ε", "$": "T' → ε" },
  F: { a: "F → a", "(": "F → (E)" },
};

export const slrTableData: SLRTable = {
  0: { n: "s2", E: "1" },
  1: { "+": "s3", "$": "acc" },
  2: { "+": "r2", "$": "r2" },
  3: { n: "s4" },
  4: { "+": "r1", "$": "r1" },
};

export const ll1ExampleSet: ExampleSet = {
  "a+a$": [
    { stack: "$E", input: "a+a$", action: "E → TE'" },
    { stack: "$E'T", input: "a+a$", action: "T → FT'" },
    { stack: "$E'T'F", input: "a+a$", action: "F → a" },
    { stack: "$E'T'a", input: "a+a$", action: "Match a" },
    { stack: "$E'T'", input: "+a$", action: "T' → +TE'" },
    { stack: "$E'T'E'+", input: "+a$", action: "Match +" },
    { stack: "$E'T'E'", input: "a$", action: "E → TE'" },
    { stack: "$E'T'E'T", input: "a$", action: "T → FT'" },
    { stack: "$E'T'E'T'F", input: "a$", action: "F → a" },
    { stack: "$E'T'E'T'a", input: "a$", action: "Match a" },
    { stack: "$E'T'E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'T'E'", input: "$", action: "E' → ε" },
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
    { stack: "$E'T')ET", input: "a)$", action: "T → FT'" },
    { stack: "$E'T')ET'F", input: "a)$", action: "F → a" },
    { stack: "$E'T')ET'a", input: "a)$", action: "Match a" },
    { stack: "$E'T')ET'", input: ")$", action: "T' → ε" },
    { stack: "$E'T')E", input: ")$", action: "E' → ε" },
    { stack: "$E'T')", input: ")$", action: "Match )" },
    { stack: "$E'T'", input: "$", action: "T' → ε" },
    { stack: "$E'", input: "$", action: "E' → ε" },
    { stack: "$", input: "$", action: "Accept" },
  ],
};
