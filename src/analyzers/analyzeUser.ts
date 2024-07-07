import { serviceLogger } from "../config/logger";
import { isSubscribed } from "../enums/subscriptionType.enum";
import User from "../schema/user";

const logger = serviceLogger('analyzeUser.ts')

interface AnalysisRating { fieldsPresence: number, contentQuality: number }

export const startUserAnalyzer = async () => {
  const users = await User.findById("667d51b79e7472665905f9fd");

  if(!users){
    logger.info("No user found!")
    return;
  }

  analyzeUserProfile(users)
}

const analyzeUserProfile = async (user: any): Promise<AnalysisRating> => {
  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }
  logger.info(analysisRating)

  analysisRating = addPointForImageURL(user, analysisRating);
  logger.info(analysisRating)

  analysisRating = addPointIfAtleastSocialsExisting(user, analysisRating);
  logger.info(analysisRating)

  if (user && user.position && user.phone && user.desc) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.info(analysisRating)

  if (user && user.address && user.address.city && user.address.country) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.info(analysisRating)

  if (user && user.languages?.length > 0) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.info(analysisRating)

  // add points for subscribed users
  if (user && isSubscribed(user.subsType)) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  200
    }
  }
  logger.info(analysisRating)

  // add LLM analysis points code here
  // perhaps edu, exp, cert, proj, award

  return analysisRating
}

const analyzeEducation = async (workInfo: any): Promise<AnalysisRating> => {

  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }

  analysisRating = addPointsForWorkInfoFieldPresence(workInfo, analysisRating)

  return analysisRating
}

const analyzeExperience = async (workInfo: any): Promise<AnalysisRating> => {

  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }

  analysisRating = addPointsForWorkInfoFieldPresence(workInfo, analysisRating)

  return analysisRating
}

const analyzeCertificate = async (workInfo: any): Promise<AnalysisRating> => {

  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }

  analysisRating = addPointsForWorkInfoFieldPresence(workInfo, analysisRating)

  return analysisRating
}

const analyzeProject = async (project: any): Promise<AnalysisRating> => {

  if (project.from && project.to && project.imageURL) {
    // Code to execute if all fields are present
  }

  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }

  analysisRating = addPointForImageURL(project, analysisRating)

  if (project && project.from && project.to) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    } 
  }

  return analysisRating
}

const analyzeAward = async (award: any): Promise<AnalysisRating> => {

  let analysisRating: AnalysisRating = {
    fieldsPresence: 0,
    contentQuality: 0
  }

  analysisRating = addPointForImageURL(award, analysisRating)

  if (award && award.year) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    } 
  }

  return analysisRating
}

const addPointForImageURL = (entity: any, analysisRating: AnalysisRating): AnalysisRating => {
  if(entity && entity.imageURL){
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    } 
  }
   
  return analysisRating;
}

const addPointIfAtleastSocialsExisting = (user: any, analysisRating: AnalysisRating): AnalysisRating => {
  let socialsCount = 0;

  if(user){
    if (user.fb) {
      socialsCount = socialsCount + 1;
    }
    if (user.ig) {
      socialsCount = socialsCount + 1;
    }
    if (user.yt) {
      socialsCount = socialsCount + 1;
    }
    if (user.gh) {
      socialsCount = socialsCount + 1;
    }
    if (user.tw) {
      socialsCount = socialsCount + 1;
    }
    if (user.li) {
      socialsCount = socialsCount + 1;
    }
    if (user.web) {
      socialsCount = socialsCount + 1;
    }
  }

  if(socialsCount >= 3){
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence + 1
    }
  }

  return analysisRating;
}

const addPointsForWorkInfoFieldPresence = (workInfo: any, analysisRating: AnalysisRating): AnalysisRating => {
  addPointForImageURL(workInfo, analysisRating);

  if (workInfo && workInfo.from && workInfo.to) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence
    }
  }

  if (workInfo && workInfo.address && workInfo.address.city && workInfo.address.country) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence
    }
  }

  return analysisRating;
}