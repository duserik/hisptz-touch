import { NgModule } from "@angular/core";
import { IonicPageModule } from "ionic-angular";
import { DashboardFilterPage } from "./dashboard-filter";
import { TranslateModule } from "@ngx-translate/core";
import { PipesModule } from "../../../pipes/pipes.module";
import { SharedModule } from "../../../components/shared.module";

@NgModule({
  declarations: [DashboardFilterPage],
  imports: [
    SharedModule,
    PipesModule,
    TranslateModule.forChild(),
    IonicPageModule.forChild(DashboardFilterPage)
  ],
  exports: [DashboardFilterPage]
})
export class DashboardFilterPageModule {}
