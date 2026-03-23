import { Page } from '@playwright/test';

export interface Ability {}

export interface Action {
    performAs(actor: Actor): Promise<void>;
}

export interface Task {
    performAs(actor: Actor): Promise<void>;
}

export class Actor {
    constructor(readonly name: string, readonly page: Page) {}

    static named(name: string, page: Page): Actor {
        return new Actor(name, page);
    }

    async attemptsTo(...activities: (Task | Action)[]) {
        for (const activity of activities) {
            await activity.performAs(this);
        }
    }

    async extractTokenFromStorage(): Promise<string | null> {
        return await this.page.evaluate(() => {
            const storages = [localStorage, sessionStorage];
            for (const storage of storages) {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    if (key) {
                        const value = storage.getItem(key);
                        if (value && value.startsWith('ey') && value.length > 100) {
                            return value;
                        }
                    }
                }
            }
            return null;
        });
    }
}
