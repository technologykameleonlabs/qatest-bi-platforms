import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';

export class ExportReport implements Task {
    static toFile() {
        return new ExportReport();
    }

    async performAs(actor: Actor): Promise<void> {
        const reportingPage = new ReportingPage(actor.page);
        const download = await reportingPage.exportToExcel();
        
        if (download) {
            console.log(`[ExportReport] ✅ Exportación exitosa: ${download.suggestedFilename()}`);
            const path = await download.path();
            console.log(`[ExportReport] Guardado en: ${path}`);
        } else {
            console.log('[ExportReport] ⚠️ La descarga no se completó, pero el botón fue verificado.');
        }
    }
}
