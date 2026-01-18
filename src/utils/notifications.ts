import { logger } from './logger';
import { SentinelConfig } from './config';

export interface NotificationPayload {
    title: string;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'success';
    details?: {
        repository?: string;
        vulnerabilities?: number;
        fixed?: number;
        prUrl?: string;
    };
}

export class NotificationService {
    private config: SentinelConfig['notifications'];

    constructor(config: SentinelConfig['notifications']) {
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
            username: 'The Sentinel',
            icon_emoji: ':shield:',
            attachments: [
                {
                    color,
                    title: `${emoji} ${payload.title}`,
                    text: payload.message,
                    fields: this.buildFields(payload.details),
                    footer: 'The Sentinel Security Bot',
                    footer_icon: 'https://github.com/DevDonzo.png',
                    ts: Math.floor(Date.now() / 1000)
                }
            ]
        };

        try {
            const response = await fetch(this.config.slack.webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackPayload)
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
            username: 'The Sentinel',
            avatar_url: 'https://github.com/DevDonzo.png',
            embeds: [
                {
                    title: `${emoji} ${payload.title}`,
                    description: payload.message,
                    color,
                    fields: this.buildFields(payload.details),
                    footer: {
                        text: 'The Sentinel Security Bot'
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };

        try {
            const response = await fetch(this.config.discord.webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(discordPayload)
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
     * Send email notification (placeholder - requires email service)
     */
    private async sendEmail(payload: NotificationPayload): Promise<void> {
        if (!this.config.email) {
            return;
        }

        logger.warn('Email notifications not yet implemented');
        // TODO: Implement email service integration (SendGrid, AWS SES, etc.)
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
                inline: true
            });
        }

        if (details.vulnerabilities !== undefined) {
            fields.push({
                name: 'Vulnerabilities Found',
                value: details.vulnerabilities.toString(),
                inline: true
            });
        }

        if (details.fixed !== undefined) {
            fields.push({
                name: 'Fixed',
                value: details.fixed.toString(),
                inline: true
            });
        }

        if (details.prUrl) {
            fields.push({
                name: 'Pull Request',
                value: details.prUrl,
                inline: false
            });
        }

        return fields;
    }

    /**
     * Get color for severity (hex)
     */
    private getSeverityColor(severity: string): string {
        const colors: Record<string, string> = {
            info: '#3b82f6',
            warning: '#f59e0b',
            error: '#ef4444',
            success: '#10b981'
        };
        return colors[severity] || colors.info;
    }

    /**
     * Get color for severity (integer for Discord)
     */
    private getSeverityColorInt(severity: string): number {
        const colors: Record<string, number> = {
            info: 0x3b82f6,
            warning: 0xf59e0b,
            error: 0xef4444,
            success: 0x10b981
        };
        return colors[severity] || colors.info;
    }

    /**
     * Get emoji for severity
     */
    private getSeverityEmoji(severity: string): string {
        const emojis: Record<string, string> = {
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌',
            success: '✅'
        };
        return emojis[severity] || emojis.info;
    }

    /**
     * Send scan started notification
     */
    async notifyScanStarted(repository: string): Promise<void> {
        await this.send({
            title: 'Security Scan Started',
            message: `The Sentinel has started scanning for vulnerabilities`,
            severity: 'info',
            details: { repository }
        });
    }

    /**
     * Send scan completed notification
     */
    async notifyScanCompleted(repository: string, vulnerabilities: number): Promise<void> {
        const severity = vulnerabilities > 0 ? 'warning' : 'success';
        const message = vulnerabilities > 0
            ? `Found ${vulnerabilities} vulnerabilities`
            : 'No vulnerabilities found';

        await this.send({
            title: 'Security Scan Completed',
            message,
            severity,
            details: { repository, vulnerabilities }
        });
    }

    /**
     * Send fix applied notification
     */
    async notifyFixApplied(repository: string, fixed: number, prUrl: string): Promise<void> {
        await this.send({
            title: 'Security Fix Applied',
            message: `The Sentinel has automatically fixed ${fixed} vulnerability(ies)`,
            severity: 'success',
            details: { repository, fixed, prUrl }
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
            details: { repository }
        });
    }
}

export function createNotificationService(config: SentinelConfig['notifications']): NotificationService {
    return new NotificationService(config);
}
