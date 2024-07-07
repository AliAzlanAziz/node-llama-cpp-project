import {fileURLToPath} from "url";
import path from "path";
import {getLlama, JinjaTemplateChatWrapper, LlamaChatSession, LlamaJsonSchemaGrammar, LlamaLogLevel} from "node-llama-cpp";
import { serviceLogger } from "../config/logger";

const logger = serviceLogger('initializeLlama.ts');

let session: LlamaChatSession;
let llamaGrammar: LlamaJsonSchemaGrammar<any>;

const initLlama = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const modelsFolderDirectory = path.join(__dirname, "../../", "models");

  const llama = await getLlama({
    gpu: 'cuda',
  });

  const model = await llama.loadModel({
    modelPath: path.join(modelsFolderDirectory, "Mistral-7B-Instruct-v0.3.Q5_K_M.gguf"),
    gpuLayers: 'max'
  });
  logger.info("Model Loaded");
  
  const context = await model.createContext();
  logger.info("Context Created");

  const chatWrapper = new JinjaTemplateChatWrapper({
    template: model.fileInfo.metadata.tokenizer.chat_template!,
    systemRoleName: 'assistant',
    userRoleName: 'user',
  })

  session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    chatWrapper
  });
  logger.info("Session Initialized");

  llamaGrammar = await llama.createGrammarForJsonSchema({
    type: "object",
    properties: {
      verbs: {
        type: "array",
        items: {
          type: "string"
        }
      }
    }
  });
  logger.info("Llama Grammar Initialized");

}

export {
  session,
  llamaGrammar
}

export default initLlama;