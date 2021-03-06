import { Component,OnInit,Input } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';

/*
  Generated class for the DataElementSync page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-data-element-sync',
  templateUrl: 'data-element-sync.html'
})
export class DataElementSyncPage  implements OnInit{

  @Input() dataElements;
  public loadingMessage : string = "Preparing data";
  public isLoading : boolean = true;

  constructor(public navCtrl: NavController, public navParams: NavParams) {}

  ngOnInit() {
    if(this.dataElements){
      this.isLoading = false;
    }
  }

}
