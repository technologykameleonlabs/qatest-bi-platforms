import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';
import { expect } from '@playwright/test';

export class FilterReport implements Task {
    constructor(private dateRange: string) {}

    static forDateRange(range: string) {
        return new FilterReport(range);
    }

    async performAs(actor: Actor): Promise<void> {
        const reportingPage = new ReportingPage(actor.page);
        await reportingPage.navigate();
        
        // Aplicar el filtro de fecha real si se especifica
        if (this.dateRange && this.dateRange !== 'Default') {
            await reportingPage.selectDateRange(this.dateRange);
        }
        
        // Verificar que el reporte cargó con datos tras el filtro
        const { rowCount } = await reportingPage.verifyReportLoaded();
        expect(rowCount).toBeGreaterThan(0);
        console.log(`[FilterReport] ✅ Filtro "${this.dateRange}" aplicado. Filas: ${rowCount}`);
    }
}
