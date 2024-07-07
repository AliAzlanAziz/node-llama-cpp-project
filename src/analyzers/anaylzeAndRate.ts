import { serviceLogger } from "../config/logger";
import { trashTexts } from "../dummy/dummyText";
import { llamaGrammar, session } from "../llama/initializeLlama";

const logger = serviceLogger('analyzeAndRate.ts');

export const runAnaylyzerAndRate = async (text: string) => {
    // const query = "Count the number of verbs in the given text. If a verb is being repeated one or multiple times then count it as many times as it is occuring, do not write any text in the answer except for just the count. Text: Developed APIs in Django and the desktop software using Flask. Deployed lambda functions on AWS. Worked with Elasticsearch, Supabase, PlayWright, Vuejs. Designed and developed key features for the centralized health care product Medic for UAE hospitals and clinics using Spring Boot, Angular, AWS, and MySQL. Implemented caching layer using Redis reducing the query time by 100x in extreme cases, also implemented rate limiting on API susing Bucket4J with HCache to prevent DDOS attack and data duplication. Automated the flow of payment using Stripe as the payment gateway thereby making it easier for clients to pay and the company to have collected the subscription fee by the specific time period. Built a CI/CD pipeline on Jenkins with stages for testing, code analysis, vulnerability analysis, reports publishing and deploying for QA and Production. Developed Excel File Parsers and integrated 3rd party APIs with HL7 standards to comply with UAE health care rules and regulations. Other stuff includes webhooks, documentation with Swagger, Schedulers, Aspect Oriented Programming (AOP), MySQL procedures and triggers, Flyway migrations, Thymeleaf for HTML mailing, Spring Security to work with authentication and passwords, MockMVC for unit testing to ensure an error free system. Provide fullstack, backend, module and specific use cases solutions as demanded by clientsAutomated the Radiotherapy Treatment Planning System using Eclipse Scripting API in C# .NET 4.5 framework. After the automation plans that used to take around 45 minutes to an hour if designed manually now would take at most 30 seconds"
    // const query = "Answer 1 if the given text is semantically correct else answer 0, do not write any text in the answer except for 0 and 1. Text: Designed and developed key features for the centralized health care product Medic for UAE hospitals and clinics using Spring Boot, Angular, AWS, and MySQL. Implemented caching layer using Redis reducing the query time by 100x in extreme cases, also implemented rate limiting on API susing Bucket4J with HCache to prevent DDOS attack and data duplication. Automated the flow of payment using Stripe as the payment gateway thereby making it easier for clients to pay and the company to have collected the subscription fee by the specific time period. Built a CI/CD pipeline on Jenkins with stages for testing, code analysis, vulnerability analysis, reports publishing and deploying for QA and Production. Developed Excel File Parsers and integrated 3rd party APIs with HL7 standards to comply with UAE health care rules and regulations. Other stuff includes webhooks, documentation with Swagger, Schedulers, Aspect Oriented Programming (AOP), MySQL procedures and triggers, Flyway migrations, Thymeleaf for HTML mailing, Spring Security to work with authentication and passwords, MockMVC for unit testing to ensure an error free system"
    const query = `Answer 1 if the given text is semantically correct and sounds like a job experience else answer 0, do not write any text in the answer except for 0 and 1. Text: ${text}`
    // const query = "Given user's work/job experiences, each enclosed in '<<' (indicates start) and '>>' (indicates end). Start with 0 points and calculate points by add 1 point for the work the user has mentioned that he did, consider comma separated work. After calculating points give me the total points with no other text of any sort as output?<<Developed APIs in Django and the desktop software using Flask. Deployed lambda functions on AWS. Worked with Elasticsearch, Supabase, PlayWright, Vuejs>><<Designed and developed key features for the centralized health care product Medic for UAE hospitals and clinics using Spring Boot, Angular, AWS, and MySQL. Implemented caching layer using Redis reducing the query time by 100x in extreme cases, also implemented rate limiting on API susing Bucket4J with HCache to prevent DDOS attack and data duplication. Automated the flow of payment using Stripe as the payment gateway thereby making it easier for clients to pay and the company to have collected the subscription fee by the specific time period. Built a CI/CD pipeline on Jenkins with stages for testing, code analysis, vulnerability analysis, reports publishing and deploying for QA and Production. Developed Excel File Parsers and integrated 3rd party APIs with HL7 standards to comply with UAE health care rules and regulations. Other stuff includes webhooks, documentation with Swagger, Schedulers, Aspect Oriented Programming (AOP), MySQL procedures and triggers, Flyway migrations, Thymeleaf for HTML mailing, Spring Security to work with authentication and passwords, MockMVC for unit testing to ensure an error free system>><<Provide fullstack, backend, module and specific use cases solutions as demanded by clients>><<Automated the Radiotherapy Treatment Planning System using Eclipse Scripting API in C# .NET 4.5 framework. After the automation plans that used to take around 45 minutes to an hour if designed manually now would take at most 30 seconds>>"

    const startTime = Date.now();

    const response = await session.prompt(query);

    const endTime = Date.now();
    const duration = (endTime - startTime)/1000;

    logger.info(`Duration: ${duration}s | Answer: ${response} | Text: ${text.substring(0, 40)}...`);
}

export const run = async () => {
    try{
        for(let i=0; i<trashTexts.length; i++){
            logger.info(`Index: ${i+1}`)
            await runAnaylyzerAndRate(trashTexts[i].text)
        }
    } catch(error) {
        logger.info(error)
    }
}