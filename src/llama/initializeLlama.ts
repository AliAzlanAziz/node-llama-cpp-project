import {fileURLToPath} from "url";
import path from "path";
import {ChatHistoryItem, GeneralChatWrapper, getLlama, LlamaChatSession} from "node-llama-cpp";
import { serviceLogger } from "../config/logger";

const logger = serviceLogger('initializeLlama.ts');

let session: LlamaChatSession;
let initialChatHistory: ChatHistoryItem[];

const initLlama = async () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const modelsFolderDirectory = path.join(__dirname, "../../", "models");

  const llama = await getLlama({
    gpu: 'cuda',
  });

  const model = await llama.loadModel({
    modelPath: path.join(modelsFolderDirectory, "Mistral-7B-Instruct-v0.3.Q5_K_M.gguf"),
  });
  logger.info("Model Loaded");
  
  const context = await model.createContext();
  logger.info("Context Created");

  session = new LlamaChatSession({
    contextSequence: context.getSequence(),
    chatWrapper: new GeneralChatWrapper() // if I use no chat wrapper then with no chat history error of alternate user roles won't appear
  });
  logger.info("Session Initialized");

  initialChatHistory = session.getChatHistory();
}

export {
  session,
  initialChatHistory
}

export default initLlama;