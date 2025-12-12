
import { z } from "zod";

export type Dir = {
  title: string;
  children: (Dir | Doc)[];
}

export type Doc = {
  title: string;
  content: string;
}

export type File = {
  path: string;
  content: string;
}

export type ChatActions = {
  action_type: 'Edited File' | 'Created File' | 'Deleted File';
  details: any;
}

export const ChatActionsSchema = z.object({
  action_type: z.enum(['Edited File', 'Created File', 'Deleted File']).describe('The type of system action taken.'),
  details: z.string().describe('Additional details about the action taken.'),
})

export const ChatSchema = z.object({
  message: z.string().describe('The is information about the response and actions taken.'),
  special_instructions: z.nullable(z.string()).describe('Any special instructions related to the response. Do not feel obligated to fill this out.'),
  system_actions: z.array(ChatActionsSchema).describe('The actions you took.'),
});

export type ChatExchange = z.infer<typeof ChatSchema>;

export interface ChatLog {
  id?: number;
  user_id: string;
  project_id: string;
  response_id: string;
  previous_response_id: string | null;
  request_text?: string;
  response_text?: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ChatResponse = {
  response: string;
  lastResponseId: string;
  error: boolean;
}

export type Conversation = {
  request: string;
  response: ChatResponse;
}

export type EditorTypes = 'markdown' | 'html';