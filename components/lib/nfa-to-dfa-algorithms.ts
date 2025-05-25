import {
  NfaOutput as Nfa, // Using NfaOutput as the general NFA type
  DfaStateData,
  DfaTransitionData,
  calculateEpsilonClosure,
  calculateMove
} from './automata-helpers';

// Interface for detailed step breakdown of NFA to DFA conversion (from NfaToDfaVisualizer)
export interface NfaToDfaStepDetail {
  dfaStateBeingProcessedId: string;
  symbol: string;
  nfaStatesForMove: Set<string>; 
  moveOutputNfaStates: Set<string>;
  epsilonClosureInputNfaStates: Set<string>; 
  epsilonClosureOutputNfaStates: Set<string>; 
  targetDfaStateId: string; 
  isNewDfaState: boolean; 
  transitionCreated: boolean; 
}

export interface ProcessDfaStateResult {
    newDfaStatesCreated: DfaStateData[];
    newDfaTransitions: DfaTransitionData[];
    stepDetailsForSymbol: NfaToDfaStepDetail[];
}

/**
 * Processes a single DFA state during subset construction.
 * For the given currentDfaStateToProcess, it iterates through all alphabet symbols,
 * calculates move and epsilon-closure, determines the target DFA state,
 * and identifies new DFA states and transitions.
 */
export const processDfaStateInSubsetConstruction = (
  currentDfaStateToProcess: DfaStateData,
  nfa: Nfa, // The input NFA
  dfaAlphabet: string[], // DFA's alphabet (usually same as NFA's)
  allKnownDfaStates: DfaStateData[], // Includes states already in DFA and those in processing queue
                                     // Used to check if a target DFA state ID already exists.
  nfaAcceptStateIds: string[] // To determine if a new DFA state is an accept state
): ProcessDfaStateResult => {
  const newDfaStatesCreated: DfaStateData[] = [];
  const newDfaTransitions: DfaTransitionData[] = [];
  const stepDetailsForSymbol: NfaToDfaStepDetail[] = [];

  dfaAlphabet.forEach(symbol => {
    const moveResultNfaIds = calculateMove(currentDfaStateToProcess.nfaStateIds, symbol, nfa);
    const targetNfaStateIds = calculateEpsilonClosure(moveResultNfaIds, nfa);

    let targetDfaStateId = "";
    let isNewDfa = false;
    let transitionAdded = false;
    
    let finalTargetDfaStateForTransition: DfaStateData | undefined = undefined;

    if (targetNfaStateIds.size > 0) {
      targetDfaStateId = `{${Array.from(targetNfaStateIds).sort().join(',')}}`;
      
      // Check if this DFA state (by its ID string) already exists or is newly found in this processing batch
      finalTargetDfaStateForTransition = allKnownDfaStates.find(s => s.id === targetDfaStateId);
      
      if (!finalTargetDfaStateForTransition) {
        // If not among all known (already processed or in queue), it's truly new
        const newDfaStateData: DfaStateData = {
          id: targetDfaStateId,
          nfaStateIds: targetNfaStateIds,
          isAcceptState: Array.from(targetNfaStateIds).some(id => nfaAcceptStateIds.includes(id)),
          isStartState: false, // New states are generally not start states unless it's the very first one
        };
        newDfaStatesCreated.push(newDfaStateData);
        finalTargetDfaStateForTransition = newDfaStateData;
        isNewDfa = true;
      } else {
        isNewDfa = false; // It's an existing state
      }

      newDfaTransitions.push({
        fromDfaStateId: currentDfaStateToProcess.id,
        toDfaStateId: finalTargetDfaStateForTransition.id, // Use the ID of the (potentially new) state
        symbol: symbol
      });
      transitionAdded = true;
    }

    stepDetailsForSymbol.push({
      dfaStateBeingProcessedId: currentDfaStateToProcess.id,
      symbol: symbol,
      nfaStatesForMove: currentDfaStateToProcess.nfaStateIds,
      moveOutputNfaStates: moveResultNfaIds,
      epsilonClosureInputNfaStates: moveResultNfaIds,
      epsilonClosureOutputNfaStates: targetNfaStateIds,
      targetDfaStateId: targetDfaStateId, 
      isNewDfaState: isNewDfa, // isNewDfaState is true if it wasn't in allKnownDfaStates
      transitionCreated: transitionAdded
    });
  });

  return {
    newDfaStatesCreated,
    newDfaTransitions,
    stepDetailsForSymbol
  };
};
