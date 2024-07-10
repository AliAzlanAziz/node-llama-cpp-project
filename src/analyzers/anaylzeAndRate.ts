import { serviceLogger } from "../config/logger";
import { trashTexts } from "../dummy/dummyText";
import { initialChatHistory, session } from "../llama/initializeLlama";

const logger = serviceLogger('analyzeAndRate.ts');

export const runAnaylyzerAndRate = async (text: string) => {
    const query = `Answer 1 if the given text is semantically correct and sounds like a job experience else answer 0, do not write any text in the answer except for 0 and 1. Text: ${text}`

    const startTime = Date.now();

    const response = await session.prompt(query);
    session.setChatHistory(initialChatHistory)

    const endTime = Date.now();
    const duration = (endTime - startTime)/1000;

    logger.debug(`Duration: ${duration}s | Answer: ${response} | Text: ${text.substring(0, 40)}...`);
}

export const run = async () => {
    try{
        for(let i=0; i<trashTexts.length; i++){
            logger.debug(`Index: ${i+1}`)
            await runAnaylyzerAndRate(trashTexts[i].text)
        }
    } catch(error) {
        logger.debug(error)
    }
}