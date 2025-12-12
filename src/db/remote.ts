import pg from "pg";
import { ChatLog } from '../types/index';

const { Pool } = pg;

const pool = new Pool();

export default pool;


export async function createChatLog(entry: ChatLog) {
  const query = {
    text: 'INSERT INTO chat_logs (user_id, project_id, response_id, previous_response_id, request_text, response_text, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    values: [entry.user_id, entry.project_id, entry.response_id, entry.previous_response_id, entry.request_text, entry.response_text, entry.created_at],
  };
  await pool.query(query);
}

export async function getChatLogsByProject(projectId: string): Promise<ChatLog[]> {
  const query = {
    text: 'SELECT * FROM chat_logs WHERE project_id = $1 ORDER BY created_at ASC',
    values: [projectId],
  };
  const res = await pool.query(query);
  return res.rows;
}

export async function deleteChatLog(id: number) {
  const query = {
    text: 'DELETE FROM chat_logs WHERE id = $1',
    values: [id],
  };
  await pool.query(query);
}
