import { NotificationService } from '../src/utils/notifications';

describe('NotificationService email delivery', () => {
    const originalFetch = global.fetch;
    const originalEnv = process.env.RESEND_API_KEY;

    afterEach(() => {
        global.fetch = originalFetch;
        if (originalEnv === undefined) {
            delete process.env.RESEND_API_KEY;
        } else {
            process.env.RESEND_API_KEY = originalEnv;
        }
        jest.restoreAllMocks();
    });

    it('posts email payloads to a configured webhook', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true });
        global.fetch = fetchMock as unknown as typeof fetch;

        const service = new NotificationService({
            enabled: true,
            email: {
                to: ['security@example.com'],
                from: 'warden@example.com',
                webhook: 'https://hooks.example.com/email',
            },
        });

        await service.send({
            title: 'Security Scan Completed',
            message: 'Found 2 vulnerabilities',
            severity: 'warning',
            details: {
                repository: 'demo/repo',
                vulnerabilities: 2,
            },
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://hooks.example.com/email',
            expect.objectContaining({
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            })
        );
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.to).toEqual(['security@example.com']);
        expect(body.subject).toContain('Security Scan Completed');
        expect(body.details.repository).toBe('demo/repo');
    });

    it('sends Resend email when an API key is configured', async () => {
        const fetchMock = jest.fn().mockResolvedValue({ ok: true });
        global.fetch = fetchMock as unknown as typeof fetch;
        process.env.RESEND_API_KEY = 're_test_key';

        const service = new NotificationService({
            enabled: true,
            email: {
                to: ['security@example.com'],
                from: 'Warden <warden@example.com>',
            },
        });

        await service.send({
            title: 'Security Fix Applied',
            message: 'Warden fixed 1 vulnerability',
            severity: 'success',
            details: {
                fixed: 1,
                prUrl: 'https://github.com/example/repo/pull/1',
            },
        });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.resend.com/emails',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer re_test_key',
                }),
            })
        );
        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body.subject).toContain('Security Fix Applied');
        expect(body.html).toContain('Pull Request');
    });
});
