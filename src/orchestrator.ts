/**
 * Warden Orchestrator
 *
 * The main entry point for the Warden security scanning and auto-patching
 * pipeline. All workflow logic is delegated to dedicated strategy classes so
 * this module stays thin and easy to extend:
 *
 *   SastWorkflow  — Static Application Security Testing
 *   DastWorkflow  — Dynamic Application Security Testing
 *
 * Adding a new scan mode only requires implementing IWorkflow and adding a
 * branch here.
 */

import { loadRules } from './core/rules';
import { loadSpecs } from './core/spec';
import { logger } from './utils/logger';
import { SastWorkflow } from './workflows/sast-workflow';
import { DastWorkflow } from './workflows/dast-workflow';
import { WardenOptions } from './types';

// Re-export WardenOptions so existing callers that imported it from
// orchestrator.ts continue to work without modification.
export type { WardenOptions };

/**
 * Run the full Warden security workflow.
 *
 * Selects the appropriate workflow strategy based on `options.scanMode`
 * (defaults to SAST), loads rules & specs, then delegates execution.
 *
 * @param options  Top-level configuration for this run.
 */
export async function runWarden(options: WardenOptions): Promise<void> {
    // ── 1. Load Core Configuration ────────────────────────────────────────────
    logger.section('📋 Loading Configuration');

    loadRules(); // Throws if WARDEN_CORE.md is missing

    const specs = loadSpecs();
    if (specs.length === 0) {
        logger.warn('No active specifications found in /SPEC. Continuing with default behaviour.');
    } else {
        logger.info(`Loaded ${specs.length} specification(s)`);
    }

    // ── 2. Select and execute the appropriate workflow ────────────────────────
    if (options.scanMode === 'dast') {
        const workflow = new DastWorkflow();
        await workflow.run(options);
    } else {
        const workflow = new SastWorkflow();
        await workflow.run(options);
    }
}
