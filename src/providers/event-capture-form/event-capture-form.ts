import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import 'rxjs/add/operator/map';
import {ProgramsProvider} from "../programs/programs";
import {DataElementsProvider} from "../data-elements/data-elements";

/*
  Generated class for the EventCaptureFormProvider provider.

  See https://angular.io/docs/ts/latest/guide/dependency-injection.html
  for more info on providers and Angular DI.
*/
@Injectable()
export class EventCaptureFormProvider {

  constructor(public http: Http, public programsProvider:ProgramsProvider, public dataElementProvider:DataElementsProvider) {}

  /**
   *
   * @param programId
   * @param currentUser
   * @returns {Promise<any>}
   */
  getProgramStages(programId, currentUser){
    let dataElementIds = [];
    let dataElementMapper = {};
    return new Promise((resolve, reject) =>  {
      console.log(programId);
      this.programsProvider.getProgramsStages(programId,currentUser).then((programsStages:any)=>{
        //obtain section ids
        //programstage sections
        //merge program stage with program stage sections
        programsStages.forEach((programsStage:any)=>{
          programsStage.programStageDataElements.forEach((programStageDataElement)=>{
            if(programStageDataElement.dataElement && programStageDataElement.dataElement.id){
              dataElementIds.push(programStageDataElement.dataElement.id);
            }
          });
        });
        this.dataElementProvider.getDataElementsByIdsForEvents(dataElementIds,currentUser).then((dataElements : any)=>{
          dataElements.forEach((dataElement : any)=>{
            dataElementMapper[dataElement.id] = dataElement;
          });
          programsStages.forEach((programsStage:any)=>{
            let ids = programsStage.id.split("-");
            if(ids.length > 1){
              programsStage.id = ids[1];
            }
            programsStage.autoGenerateEvent = JSON.parse(programsStage.autoGenerateEvent);
            programsStage.generatedByEnrollmentDate = JSON.parse(programsStage.generatedByEnrollmentDate);
            programsStage.captureCoordinates = JSON.parse(programsStage.captureCoordinates);
            programsStage.programStageDataElements.forEach((programStageDataElement)=>{
              if(programStageDataElement.dataElement && programStageDataElement.dataElement.id){
                let dataElementId = programStageDataElement.dataElement.id;
                if(dataElementId && dataElementMapper[dataElementId]){
                  programStageDataElement.dataElement = dataElementMapper[dataElementId]
                }
              }
            });
          });
          resolve(programsStages);
        }).catch(error=>{reject(error)});
      }).catch(error=>{reject(error)});
    });
  }

}
