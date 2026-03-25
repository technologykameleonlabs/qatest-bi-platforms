import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';
import { expect } from '@playwright/test';

export class ExportReport implements Task {
    static toFile() {
        return new ExportReport();
    }

    async performAs(actor: Actor): Promise<void> {
        const reportingPage = new ReportingPage(actor.page);
        const download = await reportingPage.exportReport();
        
        // Validaciones básicas de la descarga
        expect(download.suggestedFilename()).toMatch(/report/i);
        const path = await download.path();
        expect(path).toBeTruthy();
    }
}
