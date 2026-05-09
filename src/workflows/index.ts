/**
 * Workflow Interfaces
 *
 * Defines the Strategy Pattern contracts used to decouple scan-mode
 * logic from the main orchestrator entry point.
 */

import { WardenOptions, WardenRunResult } from '../types';

/**
 * A Workflow encapsulates all the steps for a particular scan mode
 * (SAST or DAST). The orchestrator simply selects the right workflow
 * and calls run().
 */
export interface IWorkflow {
    run(options: WardenOptions): Promise<WardenRunResult>;
}
