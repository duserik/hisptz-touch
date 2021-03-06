import { Injectable } from '@angular/core';
import {SqlLite} from "./sql-lite";
import {SettingsProvider} from "./settings";


/*
 Generated class for the EntryForm provider.

 See https://angular.io/docs/ts/latest/guide/dependency-injection.html
 for more info on providers and Angular 2 DI.
 */
@Injectable()
export class EntryForm {

  constructor(private sqlLite : SqlLite,private settingsProvider : SettingsProvider,) {}


  /**
   * get entry form meta data
   * @param dataSet
   * @param currentUser
   * @returns {Promise<T>}
   */
  getEntryFormMetadata(dataSet,currentUser){
    return new Promise((resolve, reject)=> {
      if(dataSet.sections.length > 0){
        let entryFormSections = [];
        this.getEntryFormSectionsObject(dataSet.sections,currentUser).then((entryFormSectionsObject : any)=>{
          dataSet.sections.forEach((section:any,index:any)=>{
            let sectionObject = entryFormSectionsObject[section.id];
            if(sectionObject.id){
              entryFormSections.push({
                name : sectionObject.name,id : index,dataElements : sectionObject.dataElements
              })
            }
          });
          if(entryFormSections.length > 0){
            resolve(entryFormSections);
          }else{
            this.getDefaultEntryForm(dataSet,currentUser).then(defaultEntryForm=>{
              resolve(defaultEntryForm);
            });
          }
        },error=>{
          reject(error);
        });
      }else{
        this.getDefaultEntryForm(dataSet,currentUser).then(defaultEntryForm=>{
          resolve(defaultEntryForm);
        });
      }
    });
  }

  /**
   * get entry form using sections
   * @param sections
   * @param currentUser
   * @returns {Array}
   */
  getEntryFormSectionsObject(sections,currentUser){
    let ids = [];
    let resource = "sections";
    let entryFormSectionsObject = {};
    sections.forEach((section : any)=>{
      ids.push(section.id);
    });
    return new Promise((resolve, reject) =>{
      this.sqlLite.getDataFromTableByAttributes(resource,"id",ids,currentUser.currentDatabase).then((selectedSections : any)=>{
        selectedSections.forEach((section: any)=>{
          entryFormSectionsObject[section.id] = section;
        });
        resolve(entryFormSectionsObject);
      });
    });
  }

  /**
   * get default using data set data element
   * @param dataSet
   * @returns {Promise<T>}
   */
  getDefaultEntryForm(dataSet,currentUser){
    return new Promise((resolve, reject) =>{
      this.settingsProvider.getSettingsForTheApp(currentUser).then((appSettings: any)=>{
        let dataEntrySettings = this.settingsProvider.getDefaultSettings().entryForm;
        if(appSettings && appSettings.entryForm){
          dataEntrySettings = appSettings.entryForm;
        }
        if(!(dataEntrySettings && dataEntrySettings.label)){
          dataEntrySettings = {label : "displayName",maxDataElementOnDefaultForm : 4}
        }
        let dataElements = this.getDataElements(dataSet);
        let defaultEntryForm = this.getDataElementSections(dataElements,dataEntrySettings.maxDataElementOnDefaultForm);
        resolve(defaultEntryForm);
      });
    });
  }

  /**
   * get dataElements based on data set
   * @param dataSet
   * @returns {Array}
   */
  getDataElements(dataSet){
    let dataElements = [];
    if(dataSet.dataElements && dataSet.dataElements.length > 0){
      dataElements = dataSet.dataElements;
    }else if(dataSet.dataSetElements && dataSet.dataSetElements.length > 0){
      dataSet.dataSetElements.forEach((dataSetElement :any)=>{
        dataElements.push(dataSetElement.dataElement);
      });
    }
    return dataElements;
  }

  /**
   * get divide dataElements into sections for data entry
   * @param dataElements
   * @returns {Array}
   */
  getDataElementSections(dataElements,maxDataElements){
    let sectionsCounter = Math.ceil(dataElements.length/maxDataElements);
    let sections = [];
    for(let index = 0; index < sectionsCounter; index ++){
      sections.push({
        name : "Page " + (index + 1) + " of " + sectionsCounter,
        id : index,
        dataElements :dataElements.splice(0,maxDataElements)
      });
    }
    return sections;
  }

}
