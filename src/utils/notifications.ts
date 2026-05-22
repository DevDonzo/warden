import { logger } from './logger';
import { WardenConfig } from './config';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface NotificationPayload {
    title: string;
    message: string;
    severity: NotificationSeverity;
    details?: {
        repository?: string;
        vulnerabilities?: number;
        fixed?: number;
        prUrl?: string;
    };
}

const SEVERITY_COLORS_HEX: Record<NotificationSeverity, string> = {
    info: '#3b82f6',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#10b981',
};

const SEVERITY_COLORS_INT: Record<NotificationSeverity, number> = {
    info: 0x3b82f6,
    warning: 0xf59e0b,
    error: 0xef4444,
    success: 0x10b981,
};

const SEVERITY_EMOJIS: Record<NotificationSeverity, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
};

interface EmailMessage {
    to: string[];
    from: string;
    subject: string;
    text: string;
    html: string;
}

export class NotificationService {
    private config: WardenConfig['notifications'];

    constructor(config: WardenConfig['notifications']) {
        this.config = config;
    }

    /**
     * Send notification to all configured channels
     */
    async send(payload: NotificationPayload): Promise<void> {
        if (!this.config.enabled) {
            logger.debug('Notifications disabled, skipping');
            return;
        }

        const promises: Promise<void>[] = [];

        if (this.config.slack) {
            promises.push(this.sendSlack(payload));
        }

        if (this.config.discord) {
            promises.push(this.sendDiscord(payload));
        }

        if (this.config.email) {
            promises.push(this.sendEmail(payload));
        }

        try {
            await Promise.all(promises);
            logger.debug('Notifications sent successfully');
        } catch (error: any) {
            logger.error('Failed to send some notifications', error);
        }
    }

    /**
     * Send Slack notification
     */
    private async sendSlack(payload: NotificationPayload): Promise<void> {
        if (!this.config.slack?.webhook) {
            return;
        }

        const color = this.getSeverityColor(payload.severity);
        const emoji = this.getSeverityEmoji(payload.severity);

        const slackPayload = {
            channel: this.config.slack.channel,
            username: 'Warden',
            icon_emoji: ':shield:',
            attachments: [
                {
                    color,
                    title: `${emoji} ${payload.title}`,
                    text: payload.message,
                    fields: this.buildFields(payload.details),
                    footer: 'Warden Security Bot',
                    footer_icon: 'https://github.com/DevDonzo.png',
                    ts: Math.floor(Date.now() / 1000),
                },
            ],
        };

        try {
            const response = await fetch(this.config.slack.webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackPayload),
            });

            if (!response.ok) {
                throw new Error(`Slack API error: ${response.statusText}`);
            }

            logger.debug('Slack notification sent');
        } catch (error: any) {
            logger.error('Failed to send Slack notification', error);
            throw error;
        }
    }

    /**
     * Send Discord notification
     */
    private async sendDiscord(payload: NotificationPayload): Promise<void> {
        if (!this.config.discord?.webhook) {
            return;
        }

        const color = this.getSeverityColorInt(payload.severity);
        const emoji = this.getSeverityEmoji(payload.severity);

        const discordPayload = {
            username: 'Warden',
            avatar_url: 'https://github.com/DevDonzo.png',
            embeds: [
                {
                    title: `${emoji} ${payload.title}`,
                    description: payload.message,
                    color,
                    fields: this.buildFields(payload.details),
                    footer: {
                        text: 'Warden Security Bot',
                    },
                    timestamp: new Date().toISOString(),
                },
            ],
        };

        try {
            const response = await fetch(this.config.discord.webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload),
            });

            if (!response.ok) {
                throw new Error(`Discord API error: ${response.statusText}`);
            }

            logger.debug('Discord notification sent');
        } catch (error: any) {
            logger.error('Failed to send Discord notification', error);
            throw error;
        }
    }

    /**
     * Send email notification through Resend or a generic email webhook.
     */
    private async sendEmail(payload: NotificationPayload): Promise<void> {
        const emailConfig = this.config.email;
        if (!emailConfig) {
            return;
        }

        const message = this.buildEmailMessage(payload);

        if (emailConfig.webhook) {
            await this.sendEmailWebhook(message, payload);
            return;
        }

        const provider = emailConfig.provider || 'resend';
        if (provider !== 'resend') {
            logger.warn(`Unsupported email notification provider: ${provider}`);
            return;
        }

        await this.sendResendEmail(message);
    }

    private async sendEmailWebhook(
        message: EmailMessage,
        payload: NotificationPayload
    ): Promise<void> {
        const webhook = this.config.email?.webhook;
        if (!webhook) {
            return;
        }

        const response = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...message,
                severity: payload.severity,
                details: payload.details || {},
            }),
        });

        if (!response.ok) {
            throw new Error(`Email webhook error: ${response.status} ${response.statusText}`);
        }

        logger.debug('Email webhook notification sent');
    }

    private async sendResendEmail(message: EmailMessage): Promise<void> {
        const apiKeyEnv = this.config.email?.apiKeyEnv || 'RESEND_API_KEY';
        const apiKey = process.env[apiKeyEnv];
        if (!apiKey) {
            logger.warn(`Email notifications skipped: ${apiKeyEnv} is not set`);
            return;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Resend email error: ${response.status} ${body}`);
        }

        logger.debug('Resend email notification sent');
    }

    private buildEmailMessage(payload: NotificationPayload): EmailMessage {
        const emailConfig = this.config.email;
        if (!emailConfig) {
            throw new Error('Email config is required');
        }

        const emoji = this.getSeverityEmoji(payload.severity);
        const prefix = emailConfig.subjectPrefix || 'Warden';
        const subject = `[${prefix}] ${emoji} ${payload.title}`;
        const fields = this.buildTextFields(payload.details);
        const text = [payload.message, fields].filter(Boolean).join('\n\n');
        const html = [
            `<p>${this.escapeHtml(payload.message)}</p>`,
            this.buildHtmlFields(payload.details),
        ]
            .filter(Boolean)
            .join('');

        return {
            to: emailConfig.to,
            from: emailConfig.from,
            subject,
            text,
            html,
        };
    }

    /**
     * Build fields for notification
     */
    private buildFields(details?: NotificationPayload['details']): any[] {
        if (!details) {
            return [];
        }

        const fields: any[] = [];

        if (details.repository) {
            fields.push({
                name: 'Repository',
                value: details.repository,
                inline: true,
            });
        }

        if (details.vulnerabilities !== undefined) {
            fields.push({
                name: 'Vulnerabilities Found',
                value: details.vulnerabilities.toString(),
                inline: true,
            });
        }

        if (details.fixed !== undefined) {
            fields.push({
                name: 'Fixed',
                value: details.fixed.toString(),
                inline: true,
            });
        }

        if (details.prUrl) {
            fields.push({
                name: 'Pull Request',
                value: details.prUrl,
                inline: false,
            });
        }

        return fields;
    }

    private buildTextFields(details?: NotificationPayload['details']): string {
        const fields = this.buildFields(details);
        if (fields.length === 0) {
            return '';
        }
        return fields.map((field) => `${field.name}: ${field.value}`).join('\n');
    }

    private buildHtmlFields(details?: NotificationPayload['details']): string {
        const fields = this.buildFields(details);
        if (fields.length === 0) {
            return '';
        }
        const rows = fields
            .map(
                (field) =>
                    `<tr><th align="left">${this.escapeHtml(field.name)}</th><td>${this.escapeHtml(
                        field.value
                    )}</td></tr>`
            )
            .join('');
        return `<table>${rows}</table>`;
    }

    private escapeHtml(value: string): string {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Get color for severity (hex)
     */
    private getSeverityColor(severity: NotificationSeverity): string {
        return SEVERITY_COLORS_HEX[severity] || SEVERITY_COLORS_HEX.info;
    }

    /**
     * Get color for severity (integer for Discord)
     */
    private getSeverityColorInt(severity: NotificationSeverity): number {
        return SEVERITY_COLORS_INT[severity] || SEVERITY_COLORS_INT.info;
    }

    /**
     * Get emoji for severity
     */
    private getSeverityEmoji(severity: NotificationSeverity): string {
        return SEVERITY_EMOJIS[severity] || SEVERITY_EMOJIS.info;
    }

    /**
     * Send scan started notification
     */
    async notifyScanStarted(repository: string): Promise<void> {
        await this.send({
            title: 'Security Scan Started',
            message: `Warden has started scanning for vulnerabilities`,
            severity: 'info',
            details: { repository },
        });
    }

    /**
     * Send scan completed notification
     */
    async notifyScanCompleted(repository: string, vulnerabilities: number): Promise<void> {
        const severity = vulnerabilities > 0 ? 'warning' : 'success';
        const message =
            vulnerabilities > 0
                ? `Found ${vulnerabilities} vulnerabilities`
                : 'No vulnerabilities found';

        await this.send({
            title: 'Security Scan Completed',
            message,
            severity,
            details: { repository, vulnerabilities },
        });
    }

    /**
     * Send fix applied notification
     */
    async notifyFixApplied(repository: string, fixed: number, prUrl: string): Promise<void> {
        await this.send({
            title: 'Security Fix Applied',
            message: `Warden has automatically fixed ${fixed} vulnerability(ies)`,
            severity: 'success',
            details: { repository, fixed, prUrl },
        });
    }

    /**
     * Send error notification
     */
    async notifyError(repository: string, error: string): Promise<void> {
        await this.send({
            title: 'Security Scan Failed',
            message: `Error: ${error}`,
            severity: 'error',
            details: { repository },
        });
    }
}

export function createNotificationService(
    config: WardenConfig['notifications']
): NotificationService {
    return new NotificationService(config);
}
