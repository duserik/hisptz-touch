import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AboutPage } from './about';
import {SharedModule} from "../../components/shared.module";
import {AboutModule} from "../../components/about.module";

@NgModule({
  declarations: [
    AboutPage,
  ],
  imports: [
    IonicPageModule.forChild(AboutPage),SharedModule, AboutModule
  ],
})
export class AboutPageModule {}
