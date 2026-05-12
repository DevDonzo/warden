import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { bootstrapGitHubActions, renderGitHubActionsWorkflow } from '../src/utils/bootstrap';

describe('bootstrap', () => {
    it('renders a workflow with the requested scanner and severity', () => {
        const workflow = renderGitHubActionsWorkflow({
            scanner: 'npm-audit',
            severity: 'critical',
        });

        expect(workflow).toContain('name: Warden Security Patrol');
        expect(workflow).toContain('--scanner npm-audit');
        expect(workflow).toContain('--severity critical');
        expect(workflow).toContain('actions/upload-artifact@v4');
    });

    it('creates a workflow file without overwriting existing files by default', () => {
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'warden-bootstrap-'));
        const result = bootstrapGitHubActions({
            targetDir: tempDir,
            scanner: 'all',
            severity: 'medium',
        });

        expect(fs.existsSync(result.workflowPath)).toBe(true);
        expect(result.created).toContain(result.workflowPath);

        const second = bootstrapGitHubActions({
            targetDir: tempDir,
            scanner: 'snyk',
            severity: 'high',
        });

        expect(second.skipped).toContain(result.workflowPath);
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
});
