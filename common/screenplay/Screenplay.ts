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
            const storages = [
                { name: 'localStorage', ref: localStorage },
                { name: 'sessionStorage', ref: sessionStorage }
            ];
            for (const { name, ref } of storages) {
                for (let i = 0; i < ref.length; i++) {
                    const key = ref.key(i);
                    if (key) {
                        const value = ref.getItem(key);
                        // Log fundamental analysis for debugging
                        console.log(`[STORAGE-DEBUG] ${name} -> Key: ${key}, ValueLen: ${value?.length}, Start: ${value?.substring(0, 10)}`);
                        if (value && value.startsWith('ey') && value.length > 100) {
                            console.log(`[AUTH-DEBUG] JWT Encontrado en ${name} -> Key: ${key}`);
                            return value;
                        }
                        // Check if it's nested in a JSON object
                        if (value && value.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(value);
                                for (const subKey in parsed) {
                                    const subValue = parsed[subKey];
                                    if (typeof subValue === 'string' && subValue.startsWith('ey') && subValue.length > 100) {
                                        console.log(`[AUTH-DEBUG] JWT Encontrado (Anidado) en ${name} -> Key: ${key}, SubKey: ${subKey}`);
                                        return subValue;
                                    }
                                }
                            } catch (e) {}
                        }
                    }
                }
            }
            return null;
        });
    }
}
