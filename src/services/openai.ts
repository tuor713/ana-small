import { Message } from "../types";
import { DEFAULT_SYSTEM_PROMPT } from "../constants/systemPrompt";
import { sendChatRequest as apiSendChatRequest } from "./api";
import { SAMPLE_WAREHOUSES } from "../constants/sampleWarehouses";
import { TOOLS_CONFIG } from "../constants/tools";

const MAX_CONTENT_LENGTH = 25000;
const TRIM_MESSAGE = "\n\n[Content has been trimmed due to length]";

function trimContent(content: string | null | undefined): string {
  if (!content) {
    return "";
  }
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content;
  }
  return content.substring(0, MAX_CONTENT_LENGTH) + TRIM_MESSAGE;
}

// Use the shared TOOLS_CONFIG from constants/tools.ts

export async function sendChatRequest(
  messages: Message[],
  _systemPrompt: string, // This parameter is now ignored
  apiKey: string | null,
  signal?: AbortSignal,
  connectorId?: string,
  userWarehouses?: {
    id: string;
    name: string;
    description: string;
    schema: string;
  }[],
): Promise<Message> {
  let warehouseContext = "";
  if (connectorId) {
    const sampleWarehouse = SAMPLE_WAREHOUSES.find((w) => w.id === connectorId);
    if (sampleWarehouse) {
      warehouseContext = `\n\nYou are working with "${sampleWarehouse.name}" (${sampleWarehouse.description}). USE THIS SCHEMA WHEN MAKING QUERIES: "${sampleWarehouse.schema}".`;
    } else if (connectorId.startsWith("USER-")) {
      const userWarehouse = userWarehouses?.find((w) => w.id === connectorId);
      if (userWarehouse) {
        warehouseContext = `\n\nYou are working with "${userWarehouse.name}" (${userWarehouse.description}). USE THIS SCHEMA WHEN MAKING QUERIES: "${userWarehouse.schema}".`;
      }
    }
  }

  const systemMessage = {
    role: "system",
    content: `${DEFAULT_SYSTEM_PROMPT}${warehouseContext}\n\nYou have access to the following tools:\n\n${Object.entries(
      TOOLS_CONFIG,
    )
      .filter(([, config]) => config.enabled)
      .map(
        ([name, config]) =>
          `${config.definition.function.name} - ${config.definition.function.description}`,
      )
      .join("\n")}`,
  };

  // Trim content of all messages
  const trimmedMessages = messages.map((msg) => ({
    ...msg,
    content: trimContent(msg.content),
  }));

  const messagesToSend = [systemMessage, ...trimmedMessages];

  try {
    const response = await apiSendChatRequest(messagesToSend, signal, apiKey);
    // Trim the response content as well
    return {
      ...response,
      content: trimContent(response.content),
    };
  } catch (error) {
    throw error;
  }
}
