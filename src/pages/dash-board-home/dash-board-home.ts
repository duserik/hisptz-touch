import { Component,OnInit } from '@angular/core';
import { ToastController,ModalController} from 'ionic-angular';
import {User} from "../../providers/user";
import {DashboardService} from "../../providers/dashboard-service";
import {NetworkAvailability} from "../../providers/network-availability";
import {DashboardSearchPage} from "../dashboard-search/dashboard-search";

/*
 Generated class for the DashBoardHome page.

 See http://ionicframework.com/docs/v2/components/#navigation for more info on
 Ionic pages and navigation.
 */
@Component({
  selector: 'page-dash-board-home',
  templateUrl: 'dash-board-home.html'
})
export class DashBoardHomePage implements OnInit{

  currentUser:any;
  loadingMessage:string;
  isLoading:boolean;
  isDashboardItemsLoading:boolean;

  currentDashboardName:string;
  currentDashboardId:string;
  dashboards:any = [];
  dashBoardToDashboardItem:any = {};
  dashBoardItemObjectsAndData:any = {};
  dashBoardVisualizationData:any = {};
  openedDashboardIds:any = {};

  emptyListMessage : any;

  constructor(public modalCtrl: ModalController, public toastCtrl:ToastController,
              public NetworkAvailability : NetworkAvailability,
              public user : User,public DashboardService : DashboardService

  ) {}

  ngOnInit() {
    this.isLoading = true;
    this.loadingMessage = "Loading current user information";
    this.user.getCurrentUser().then(currentUser=> {
      this.currentUser = currentUser;
      this.loadingListOfAllDashboards(currentUser);
    }, error=> {
      this.isLoading = false;
      this.setToasterMessage("Fail to loading current user information");
    });
  }

  loadingListOfAllDashboards(currentUser) {
    let network = this.NetworkAvailability.getNetWorkStatus();
    if (network.isAvailable) {
      this.loadingMessage = "Loading dashboards from server";
      this.dashboards = [];
      this.DashboardService.allDashboards(currentUser).then((dashboards:any)=> {
        this.dashboards = dashboards;
        if (dashboards.length > 0) {
          this.currentDashboardName = dashboards[0].name;
          for (let dashboard of  dashboards) {
            this.dashBoardToDashboardItem[dashboard.id] = dashboard.dashboardItems;
          }
          this.getDashboardItemObjectsAndData(dashboards[0].dashboardItems, dashboards[0].id);
        } else {
          this.currentDashboardName = "No dashboard found";
          this.emptyListMessage = "No dashboard found from server";
        }
        this.isLoading = false;
      }, error=> {
        this.isLoading = false;
        this.currentDashboardName = "No dashboard found";
        let message = "Fail to load dashboards from the server";
        this.emptyListMessage = message;
        this.setToasterMessage(message);
        console.error(JSON.stringify(error));
      });
    } else {
      //there is no network available
      this.isLoading = false;
      this.setToasterMessage(network.message);
    }
  }

  getDashboardItemObjectsAndData(dashboardItems, selectedDashboardId) {
    this.isDashboardItemsLoading = true;
    if (dashboardItems.length > 0) {
      this.loadingMessage = "Loading dashboard items";
      if (this.dashBoardItemObjectsAndData[selectedDashboardId]) {
        this.initiateSelectedDashboardItem(selectedDashboardId);
      } else {
        this.DashboardService.getDashboardItemObjects(dashboardItems, this.currentUser).then((dashBoardItemObjects:any)=> {
          this.dashBoardItemObjectsAndData[selectedDashboardId] = dashBoardItemObjects;
          this.initiateSelectedDashboardItem(selectedDashboardId);
        }, (error:any)=> {
          this.isDashboardItemsLoading = false;
          this.initiateSelectedDashboardItem(selectedDashboardId);
          let message = "Fail to load dashboard items for ";
          if (error.errorMessage) {
            message = error.errorMessage + " ";
          }
          message = message + "in " + this.currentDashboardName;
          this.emptyListMessage = message;
          this.setToasterMessage(message);
          console.error(JSON.stringify(error));
        });
      }
    } else {
      this.initiateSelectedDashboardItem(selectedDashboardId);
      this.isDashboardItemsLoading = true;
      let message = "There are no supported dashboard item found for " + this.currentDashboardName;
      this.emptyListMessage = message;
      this.setToasterMessage(message);
    }
  }

  initiateSelectedDashboardItem(selectedDashboardId) {
    this.currentDashboardId = selectedDashboardId;
    this.isDashboardItemsLoading = false;
    if(this.dashBoardItemObjectsAndData[selectedDashboardId]){
      let selectedDashboardItems = this.dashBoardItemObjectsAndData[selectedDashboardId];
      if(selectedDashboardItems.length > 0){
        this.openedDashboardIds[selectedDashboardItems[0].id]= true;
      }
    }
  }

  updateDashboardVisualizationData(data,dashboardItemId){
    this.dashBoardVisualizationData[dashboardItemId] = data;
  }

  toggleDashboardItemCard(dashboardItemId) {
    if (!this.openedDashboardIds[dashboardItemId]) {
      this.openedDashboardIds[dashboardItemId] = true;
    }else{
      this.openedDashboardIds[dashboardItemId] = false;
    }
  }

  openDashboardListFilter() {
    if (this.dashboards.length > 0) {
      this.isLoading = true;
      this.loadingMessage = "Please wait ...";
      let modal = this.modalCtrl.create(DashboardSearchPage, {
        currentDashboardName: this.currentDashboardName,
        currentUser: this.currentUser
      });
      modal.onDidDismiss((dashboard:any)=> {
        this.isLoading = false;
        this.loadingMessage = "";
        if (dashboard && dashboard.name) {
          if (dashboard.name != this.currentDashboardName) {
            this.currentDashboardName = dashboard.name;
            let selectedDashboards = this.dashBoardToDashboardItem[dashboard.id];
            this.getDashboardItemObjectsAndData(selectedDashboards, dashboard.id);
          }
        }
      });
      modal.present();
    }
  }

  setNotificationToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      position : 'top',
      duration: 3500
    });
    toast.present();
  }

  setToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      duration: 4000
    });
    toast.present();
  }



}
