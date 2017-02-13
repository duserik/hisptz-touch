import { Component } from '@angular/core';
import { NavController,ToastController } from 'ionic-angular';
import {User} from "../../providers/user/user";
import {HttpClient} from "../../providers/http-client/http-client";
import {AppProvider} from "../../providers/app-provider/app-provider";
import {TabsPage} from "../tabs/tabs";
import {SqlLite} from "../../providers/sql-lite/sql-lite";
import { Storage } from '@ionic/storage';
import {Synchronization} from "../../providers/synchronization";
import {DataValues} from "../../providers/data-values";
import {Setting} from "../../providers/setting";
import {NetworkAvailability} from "../../providers/network-availability";

/*
  Generated class for the Login page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/
@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
  providers : [AppProvider,HttpClient,User,SqlLite,Synchronization,DataValues,Setting,NetworkAvailability]
})
export class Login {

  public loginData : any ={};
  public loadingData : boolean = false;
  public isLoginProcessActive :boolean = false;
  public loadingMessages : any = [];
  public logoUrl : string;

  //progress tracker object
  public progress : string = "0";
  public progressTracker : any;
  public completedTrackedProcess : any;
  //organisationUnit, entryForm,event

  constructor(public navCtrl: NavController,private Storage : Storage,
              private Setting: Setting,public NetworkAvailability : NetworkAvailability,
              private sqlLite : SqlLite,private synchronization:Synchronization,
              private toastCtrl: ToastController,private DataValues: DataValues,
              private app : AppProvider,private httpClient : HttpClient,private user : User) {
    this.logoUrl = 'assets/img/logo-2.png';
    this.loadingData = true;
    this.loadingMessages = [];
    this.completedTrackedProcess = [];
    this.progressTracker = this.getEmptyProgressTracker();
    this.setLoadingMessages("Please waiting..");
    this.user.getCurrentUser().then(user=>{
      this.reAuthenticateUser(user);
    });
  }

  getEmptyProgressTracker(){
    let dataBaseStructure =  this.sqlLite.getDataBaseStructure();
    let progressTracker = {};
    Object.keys(dataBaseStructure).forEach(key=>{
      let table = dataBaseStructure[key];
      if(table.canBeUpdated && table.resourceType){
        if(!progressTracker[table.resourceType]){
          progressTracker[table.resourceType] = {count : 1,passStep :[]};
        }else{
          progressTracker[table.resourceType].count += 1;
        }
      }
    });
    progressTracker["communication"] = {count : 3,passStep :[]};
    return progressTracker;
  }

  updateProgressTracker(resourceName){
    let dataBaseStructure =  this.sqlLite.getDataBaseStructure();
    let resourceType = "communication";
    if(dataBaseStructure[resourceName]){
      let table = dataBaseStructure[resourceName];
      if(table.canBeUpdated && table.resourceType){
        resourceType = table.resourceType
      }
    }
    if(this.progressTracker[resourceType].passStep.indexOf(resourceName)  == -1){
      this.progressTracker[resourceType].passStep.push(resourceName);
      this.loginData["progressTracker"] = this.progressTracker;
      this.user.setCurrentUser(this.loginData).then(()=>{});
    }
    this.updateProgressBarPercentage();
  }

  updateProgressBarPercentage(){
    let total = 0; let completed = 0;
    Object.keys(this.progressTracker).forEach(key=>{
      let process = this.progressTracker[key];
      completed += process.passStep.length;
      total += process.count;
    });
    let value = (completed/total) * 100;
    this.progress = value.toFixed(2);
  }

  getCompletedTrackedProcess(){
    let completedTrackedProcess = [];
    Object.keys(this.progressTracker).forEach(key=>{
      let process = this.progressTracker[key];
      process.passStep.forEach((completedProcessName)=>{
        if(completedTrackedProcess.indexOf(completedProcessName) == -1){
          completedTrackedProcess.push(completedProcessName);
        }
      });
    });
    return completedTrackedProcess;
  };

  ionViewDidLoad() {
    //console.log('Hello Login Page');
  }

  reAuthenticateUser(user){
    if(user){
      if(user.isLogin){
        this.loginData = user;
        this.setLandingPage();
      }else if(user.serverUrl){
        this.loginData.serverUrl = user.serverUrl;
        if(user.username){
          this.loginData.username = user.username;
        }
      }
      if(user.progressTracker){
        this.progressTracker = user.progressTracker;
      }
      this.loadingData = false;
    }else{
      this.loginData["progressTracker"] = this.getEmptyProgressTracker();
      this.progressTracker = this.getEmptyProgressTracker();
      this.loadingData = false;
    }
  }


  login() {
    if (this.loginData.serverUrl) {
      if (!this.loginData.username) {
        this.setToasterMessage('Please Enter username');
      } else if (!this.loginData.password) {
        this.setToasterMessage('Please Enter password');
      } else {
        //empty communication as well as organisation unit
        this.progressTracker.communication.passStep = [];
        this.progressTracker.organisationUnit.passStep = [];
        let resource = "Authenticating user";
        this.updateProgressBarPercentage();
        this.completedTrackedProcess = this.getCompletedTrackedProcess();
        this.loadingData = true;
        this.isLoginProcessActive = true;
        this.app.getFormattedBaseUrl(this.loginData.serverUrl)
          .then(formattedBaseUrl => {
            this.loginData.serverUrl = formattedBaseUrl;
            this.user.authenticateUser(this.loginData).then((response:any)=> {
              response = response.data;
              this.loginData = response.user;
              //set authorization key and reset password
              this.loginData.authorizationKey = btoa(this.loginData.username + ':' + this.loginData.password);
              this.updateProgressTracker(resource);
              this.user.setUserData(JSON.parse(response.data)).then(userData=>{
                this.app.getDataBaseName(this.loginData.serverUrl).then(databaseName=>{
                  resource = 'Opening database';
                  this.sqlLite.generateTables(databaseName).then(()=>{
                    this.loginData.currentDatabase = databaseName;
                    this.updateProgressTracker(resource);
                    resource = 'Loading system information';
                    this.httpClient.get('/api/system/info',this.loginData).subscribe(
                      data => {
                        data = data.json();
                        this.updateProgressTracker(resource);
                        this.user.setCurrentUserSystemInformation(data).then(()=>{
                          this.downloadingOrganisationUnits(userData);
                        },error=>{
                          this.loadingData = false;
                          this.isLoginProcessActive = false;
                          this.setLoadingMessages('Fail to set system information');
                        });
                      },error=>{
                        this.loadingData = false;
                        this.isLoginProcessActive = false;
                        this.setLoadingMessages('Fail to load system information');
                      });

                  },error=>{
                    this.setToasterMessage('Fail to open database.');
                  })
                })
              });
            }, error=> {
              this.loadingData = false;
              this.isLoginProcessActive = false;
              if (error.status == 0) {
                this.setToasterMessage("Please check your network connection");
              } else if (error.status == 401) {
                this.setToasterMessage('You have enter wrong username or password');
              } else {
                this.setToasterMessage('Please check server url');
              }
            });
          });
      }
    } else {
      this.setToasterMessage('Please Enter server url');
    }
  }

  downloadingOrganisationUnits(userData){
    let resource = 'organisationUnits';
    let ids = [];
    userData.organisationUnits.forEach(organisationUnit=>{
      if(organisationUnit.id){
        ids.push(organisationUnit.id);
      }
    });
    let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
    let fields = tableMetadata.fields;
    this.app.downloadMetadataByResourceIds(this.loginData,resource,ids,fields,null).then(response=>{
      this.setLoadingMessages('Saving organisation data');
      this.app.saveMetadata(resource,response,this.loginData.currentDatabase).then(()=>{
        this.updateProgressTracker(resource);
        this.downloadingDataSets();
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to save organisation data.');
      });
    },error=>{
      this.loadingData = false;
      this.isLoginProcessActive = false;
      this.setStickToasterMessage('Fail to download organisation data.');
    });
  }

  downloadingDataSets(){
    let resource = 'dataSets';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingSections();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' data entry form');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingSections();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save data entry form.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download data entry form.');
      });
    }
  }

  downloadingSections(){
    let resource = 'sections';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingPrograms();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' data entry form sections');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingPrograms();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save data entry form sections.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download data entry form sections.');
      });
    }
  }

  downloadingPrograms(){
    let resource = 'programs';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingProgramStageSections();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' programs');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingProgramStageSections();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save programs.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download programs.');
      });
    }
  }

  downloadingProgramStageSections(){
    let resource = 'programStageSections';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingProgramStageDataElements();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' program-stage sections');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingProgramStageDataElements();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save program-stage sections.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download program-stage sections.');
      });
    }
  }

  downloadingProgramStageDataElements(){
    let resource = 'programStageDataElements';
    if(this.completedTrackedProcess.indexOf() > -1){
      //this.downloadingIndicators();
      this.setLandingPage();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' program-stage data-elements');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          //this.downloadingIndicators();
          this.setLandingPage();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save program-stage data-elements.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download program-stage data-elements.');
      });
    }
  }

  downloadingIndicators(){
    let resource = 'indicators';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingReports();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' indicators');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingReports();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save indicators.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download indicators.');
      });
    }
  }

  downloadingReports(){
    let resource = 'reports';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.downloadingConstants();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      let filter = tableMetadata.filter;
      this.app.downloadMetadata(this.loginData,resource,null,fields,filter).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' reports');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.downloadingConstants();
        },error=>{
          this.loadingData = false;
          this.isLoginProcessActive = false;
          this.setStickToasterMessage('Fail to save reports.');
        });
      },error=>{
        this.loadingData = false;
        this.isLoginProcessActive = false;
        this.setStickToasterMessage('Fail to download reports.');
      });
    }
  }

  downloadingConstants(){
    let resource = 'constants';
    if(this.completedTrackedProcess.indexOf() > -1){
      this.setLandingPage();
    }else{
      let tableMetadata = this.sqlLite.getDataBaseStructure()[resource];
      let fields = tableMetadata.fields;
      this.app.downloadMetadata(this.loginData,resource,null,fields,null).then(response=>{
        this.setLoadingMessages('Saving '+response[resource].length+' constants');
        this.app.saveMetadata(resource,response[resource],this.loginData.currentDatabase).then(()=>{
          this.updateProgressTracker(resource);
          this.setLandingPage();
        },error=>{
          this.loadingData = false;
          this.setStickToasterMessage('Fail to save constants.');
        });
      },error=>{
        this.loadingData = false;
        this.setStickToasterMessage('Fail to download constants.');
      });
    }
  }

  setLandingPage(){
    this.loginData.isLogin = true;
    this.loginData.password = "";
    this.user.setCurrentUser(this.loginData).then(()=>{
      this.synchronization.startSynchronization().then(()=>{
        this.navCtrl.setRoot(TabsPage);
        this.loadingData = false;
        this.isLoginProcessActive = false;
      });
    });
  }

  setLoadingMessages(message){
    this.loadingMessages.push(message);
  }

  setToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  setStickToasterMessage(message){
    let toast = this.toastCtrl.create({
      message: message,
      showCloseButton : true
    });
    toast.present();
  }

}
