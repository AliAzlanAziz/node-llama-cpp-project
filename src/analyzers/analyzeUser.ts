import { log } from "console";
import { serviceLogger } from "../config/logger";
import { isSubscribed } from "../enums/subscriptionType.enum";
import { WorkInfoType } from "../enums/workInfoType.enum";
import { initialChatHistory, session } from "../llama/initializeLlama";
import Project from "../schema/project";
import User from "../schema/user";
import WorkInfo from "../schema/workInfo";
import { AnalysisRating } from "../models/AnalysisRating";
import Award from "../schema/award";

const logger = serviceLogger('analyzeUser.ts')

export const startUserAnalyzer = async () => {
  logger.info('startUserAnalyzer started')

  const users = await User.find({points: 0})
                          .select({password: 0, validTill: 0, lastActivity: 0, createdAt: 0, gender: 0, token: 0, code: 0, paidDate: 0})
                          // .skip(5)
                          // .limit(5)

  if(!users){
    logger.info("No user found!")
    return;
  }

  for(let i=0; i<users.length; i++){
    let analysisRating: AnalysisRating = {
      fieldsPresence: 0,
      contentQuality: 0,
      tags: ''
    }

    analysisRating = await analyzeUserProfile(users[i], analysisRating)
    users[i].points = analysisRating.fieldsPresence + analysisRating.contentQuality;
    users[i].tags = analysisRating.tags;

    await users[i].save();
  }

  logger.info('startUserAnalyzer ended');
}

const analyzeUserProfile = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  analysisRating = calculatePointsUserFieldPresence(user, analysisRating)

  // TODO: Query for education, experience and certificate can be merged to optimize for batch query
  analysisRating = await analyzeEducation(user, analysisRating)
  analysisRating = await analyzeExperience(user, analysisRating)
  analysisRating = await analyzeCertificate(user, analysisRating)
  analysisRating = await analyzeProject(user, analysisRating)
  analysisRating = await analyzeAward(user, analysisRating)

  logger.info({name: user.name, username: user.username})
  logger.info(analysisRating)

  return analysisRating
}

// =====================================
// FUNCTIONS TO RATE USER'S EACH SECTION

const analyzeEducation = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  const workInfos = await WorkInfo.find({user: user._id, type: WorkInfoType.EDUCATION})

  for(let i=0; i<workInfos.length; i++){
    analysisRating = calculatePointsForWorkInfoFieldPresence(workInfos[i], analysisRating)
    analysisRating = await calculatePointsForEducationViaLLM(workInfos[i], analysisRating)
    analysisRating = await calculateTagsForWorkInfoViaLLM(workInfos[i], analysisRating)
  }

  return analysisRating
}

const analyzeExperience = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  const workInfos = await WorkInfo.find({user: user._id, type: WorkInfoType.EXPERIENCE})

  for(let i=0; i<workInfos.length; i++){
    analysisRating = calculatePointsForWorkInfoFieldPresence(workInfos[i], analysisRating)
    analysisRating = await calculatePointsForExperienceViaLLM(workInfos[i], analysisRating)
    analysisRating = await calculateTagsForWorkInfoViaLLM(workInfos[i], analysisRating)
  }

  return analysisRating
}

const analyzeCertificate = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  const workInfos = await WorkInfo.find({user: user._id, type: WorkInfoType.CERTIFICATE})

  for(let i=0; i<workInfos.length; i++){
    analysisRating = calculatePointsForWorkInfoFieldPresence(workInfos[i], analysisRating)
    analysisRating = await calculatePointsForCertificateViaLLM(workInfos[i], analysisRating)
    analysisRating = await calculateTagsForWorkInfoViaLLM(workInfos[i], analysisRating)
  }

  return analysisRating
}

const analyzeProject = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  const projects = await Project.find({user: user._id})

  for(let i=0; i<projects.length; i++){
    analysisRating = calculatePointsForProjectFieldPresence(projects[i], analysisRating)
    analysisRating = await calculatePointsForProjectViaLLM(projects[i], analysisRating)
    analysisRating = await calculateTagsForProjectViaLLM(projects[i], analysisRating)
  }

  return analysisRating  
}

const analyzeAward = async (user: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  const awards = await Award.find({user: user._id})

  for(let i=0; i<awards.length; i++){
    analysisRating = calculatePointsForAwardFieldPresence(awards[i], analysisRating)
    analysisRating = await calculatePointsForAwardViaLLM(awards[i], analysisRating)
    // calling below function for Award as same field is being analyzed as that of WorkInfo
    analysisRating = await calculateTagsForWorkInfoViaLLM(awards[i], analysisRating)
  }

  return analysisRating;
}

// =================================
// FUNCTIONS TO RATE CONTENT VIA LLM

const calculatePointsForEducationViaLLM = async (workInfo: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  let points = 0;

  // workInfo.desc
  let query = `Answer 1 if the given text is semantically correct and sounds like an educational description related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.desc}`

  let startTime = Date.now();
  let response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  let endTime = Date.now();
  let duration = (endTime - startTime)/1000;

  logger.debug(`Edu Points -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.title
  query = `Answer 1 if the given text is of educational degree title else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.title}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Edu Points -> Duration: ${duration}s | Title Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.name
  query = `Answer 1 if the given text is of some reputed and known educational institute else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.name}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory);

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Edu Points -> Duration: ${duration}s | School Answer: ${response} | _id: ${workInfo._id}`);

  analysisRating = {
    ...analysisRating,
    contentQuality: analysisRating.contentQuality +  points
  }

  return analysisRating;
}

const calculatePointsForExperienceViaLLM = async (workInfo: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  let points = 0;

  // workInfo.desc
  let query = `Answer 1 if the given text is semantically correct and sounds like a work/job description related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.desc}`

  let startTime = Date.now();
  let response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  let endTime = Date.now();
  let duration = (endTime - startTime)/1000;

  logger.debug(`Exp -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.title
  query = `Answer 1 if the given text is of professional job title else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.title}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Exp -> Duration: ${duration}s | Title Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.name
  query = `Answer 1 if the given text is of some reputed and known company or workplace or organization or such else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.name}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory);

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Exp -> Duration: ${duration}s | School Answer: ${response} | _id: ${workInfo._id}`);

  analysisRating = {
    ...analysisRating,
    contentQuality: analysisRating.contentQuality +  points
  }

  return analysisRating;
}

const calculatePointsForCertificateViaLLM = async (workInfo: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  let points = 0;

  // workInfo.desc
  let query = `Answer 1 if the given text is semantically correct and sounds like a certificate description related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.desc}`

  let startTime = Date.now();
  let response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  let endTime = Date.now();
  let duration = (endTime - startTime)/1000;

  logger.debug(`Cert -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.title
  query = `Answer 1 if the given text is of certificate or workship or bootcamp or such title else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.title}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Cert -> Duration: ${duration}s | Title Answer: ${response} | _id: ${workInfo._id}`);

  // workInfo.name
  query = `Answer 1 if the given text is of some reputed and known organization or company or institute else answer 0, do not write any text in the answer except for 0 and 1. Text: ${workInfo.name}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory);

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Cert -> Duration: ${duration}s | School Answer: ${response} | _id: ${workInfo._id}`);

  analysisRating = {
    ...analysisRating,
    contentQuality: analysisRating.contentQuality +  points
  }

  return analysisRating;
}

const calculatePointsForProjectViaLLM = async (project: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  let points = 0;

  // project.desc
  let query = `Answer 1 if the given text is semantically correct and sounds like a project description related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${project.desc}`

  let startTime = Date.now();
  let response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  let endTime = Date.now();
  let duration = (endTime - startTime)/1000;

  logger.debug(`Proj -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${project._id}`);

  // project.title
  query = `Answer 1 if the given text is of project title else answer 0, do not write any text in the answer except for 0 and 1. Text: ${project.title}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Proj -> Duration: ${duration}s | Title Answer: ${response} | _id: ${project._id}`);

  // project.contrib
  query = `Answer 1 if the given text is semantically correct and sounds like a project contribution related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${project.desc}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Proj -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${project._id}`);

  analysisRating = {
    ...analysisRating,
    contentQuality: analysisRating.contentQuality +  points
  }

  return analysisRating;
}

const calculatePointsForAwardViaLLM = async (award: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  let points = 0;

  // award.desc
  let query = `Answer 1 if the given text is semantically correct and sounds like a award description related text else answer 0, do not write any text in the answer except for 0 and 1. Text: ${award.desc}`

  let startTime = Date.now();
  let response = await session.prompt(query);
  points = points + parsePointsFromResponse(response);
  session.setChatHistory(initialChatHistory)

  let endTime = Date.now();
  let duration = (endTime - startTime)/1000;

  logger.debug(`Cert -> Duration: ${duration}s | Desc Answer: ${response} | _id: ${award._id}`);

  // award.title
  query = `Answer 1 if the given text is of award title else answer 0, do not write any text in the answer except for 0 and 1. Text: ${award.title}`

  startTime = Date.now();
  response = await session.prompt(query);
  points = points + parsePointsFromResponse(response)
  session.setChatHistory(initialChatHistory)

  endTime = Date.now();
  duration = (endTime - startTime)/1000;

  logger.debug(`Cert -> Duration: ${duration}s | Title Answer: ${response} | _id: ${award._id}`);

  analysisRating = {
    ...analysisRating,
    contentQuality: analysisRating.contentQuality +  points
  }

  return analysisRating;
}

// ==================================
// FUNCTIONS TO GENERATAE TAGS BY LLM

const calculateTagsForWorkInfoViaLLM = async (workInfo: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  // nouns
  let query = `Read the given text word by word, identify 'proper nouns' and add it to the list with comma(,) separation. Only write the 'proper nouns' in the answer with comma separation, do not write any other text of any kind. Text: ${workInfo.desc}`

  let nouns = await runQueryOnTextAndGetResponse(query, workInfo.desc, workInfo._id)

  if(nouns.includes('no proper nouns')){
    return analysisRating;
  }else{
    // verbs
    query = `Read the given text word by word, identify verbs of verb type 'action, phrasal' and add it to the list with comma(,) separation. Only write the verbs in the answer with comma separation, do not write any other text of any kind. Text: ${workInfo.desc}`;

    const verbs = await runQueryOnTextAndGetResponse(query, workInfo.desc, workInfo._id)

    analysisRating = {
      ...analysisRating,
      contentQuality: analysisRating.contentQuality + nouns.split(', ').length + verbs.split(', ').length,
      tags: ' ' + analysisRating.tags + nouns.replaceAll(', ', ' ') + ' ' + workInfo.title
    }

    return analysisRating;
  }
}

const calculateTagsForProjectViaLLM = async (project: any, analysisRating: AnalysisRating): Promise<AnalysisRating> => {
  // nouns of desc + contrib
  let query = `Read the given text word by word, identify 'proper nouns' and add it to the list with comma(,) separation. Only write the 'proper nouns' in the answer with comma separation, do not write any other text of any kind.`;

  const descNouns = await runQueryOnTextAndGetResponse(query, project.desc, project._id)
  const contribNouns = await runQueryOnTextAndGetResponse(query, project.contrib, project._id)
  
  // verbs of desc + contrib
  query = `Read the given text word by word, identify verbs of verb type 'action, phrasal' and add it to the list with comma(,) separation. Only write the verbs in the answer with comma separation, do not write any other text of any kind.`;

  if(!descNouns.includes('no proper nouns')){
    const descVerbs = await runQueryOnTextAndGetResponse(query, project.desc, project._id)

    analysisRating = {
      ...analysisRating,
      contentQuality: analysisRating.contentQuality + descNouns.split(', ').length + descVerbs.split(', ').length,
      tags: ' ' + analysisRating.tags + descNouns.replaceAll(', ', ' ')
    }
  }

  if(!contribNouns.includes('no proper nouns')){
    const contribVerbs = await runQueryOnTextAndGetResponse(query, project.contrib, project._id)
    
    analysisRating = {
      ...analysisRating,
      contentQuality: analysisRating.contentQuality + contribNouns.split(', ').length + contribVerbs.split(', ').length,
      tags: ' ' + analysisRating.tags + contribNouns.replaceAll(', ', ' ') + ' ' + project.title
    }
  }

  return analysisRating;
}

// =================================
// FUNCTIONS TO CHECK FIELD PRESENCE

const calculatePointsUserFieldPresence = (user: any, analysisRating: AnalysisRating): AnalysisRating => {
  analysisRating = addPointForImageURL(user, analysisRating);
  logger.debug(analysisRating)

  analysisRating = addPointIfAtleastSocialsExisting(user, analysisRating);
  logger.debug(analysisRating)

  if (user && user.position && user.phone && user.desc) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.debug(analysisRating)

  if (user && user.address && user.address.city && user.address.country) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.debug(analysisRating)

  if (user && user.languages?.length > 0) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    }
  }
  logger.debug(analysisRating)

  // add points for subscribed users
  if (user && isSubscribed(user.subsType)) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  200
    }
  }
  logger.debug(analysisRating)

  return analysisRating;
}

const calculatePointsForWorkInfoFieldPresence = (workInfo: any, analysisRating: AnalysisRating): AnalysisRating => {
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

const calculatePointsForProjectFieldPresence = (project: any, analysisRating: AnalysisRating): AnalysisRating => {
  analysisRating = addPointForImageURL(project, analysisRating)

  if (project && project.from && project.to) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    } 
  }

  return analysisRating
}

const calculatePointsForAwardFieldPresence = (award: any, analysisRating: AnalysisRating): AnalysisRating => {
  analysisRating = addPointForImageURL(award, analysisRating)

  if (award && award.year) {
    analysisRating = {
      ...analysisRating,
      fieldsPresence: analysisRating.fieldsPresence +  1
    } 
  }

  return analysisRating;
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

// ==============
// MISC FUNCTIONS

const runQueryOnTextAndGetResponse = async (queryText: string, text: string, entity_id: string): Promise<string> => {
  const prompt = `${queryText} Text: ${text}`

  let startTime = Date.now();
  const response = await session.prompt(prompt);
  let endTime = Date.now();

  let duration = (endTime - startTime)/1000;
  session.setChatHistory(initialChatHistory);

  logger.debug(`Duration: ${duration}s | Answer: ${response} | _id: ${entity_id}`);

  return response;
}

const parsePointsFromResponse = (response: any): number => {
  try{
    if(response == 1){
      return 1;
    }else if(response == 0){
      return 0;
    }else if(typeof(response) == typeof('string')){
      logger.warn("LLM produced string as an answer instead of just a number!")

      if((response as string).includes('1')){
        return 1;
      }
      if((response as string).includes('0')){
        return 0;
      }
    }

    return 0;
  }catch(error){
    logger.error(error)
    return 0;
  }
}