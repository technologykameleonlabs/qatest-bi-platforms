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
}
