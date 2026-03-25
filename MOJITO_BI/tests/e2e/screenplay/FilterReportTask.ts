import { Actor, Task } from '../../../../common/screenplay/Screenplay';
import { ReportingPage } from '../pages/ReportingPage';

export class FilterReport implements Task {
    constructor(private dateRange: string) {}

    static forDateRange(range: string) {
        return new FilterReport(range);
    }

    async performAs(actor: Actor): Promise<void> {
        const reportingPage = new ReportingPage(actor.page);
        await reportingPage.navigate();
        await reportingPage.selectFilters(this.dateRange);
    }
}
