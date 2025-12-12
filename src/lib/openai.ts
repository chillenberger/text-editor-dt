import { Agent, run, MCPServerStdio, RunStreamEvent, setDefaultOpenAIKey } from '@openai/agents';


const GENERAL_SYSTEM_PROMPT = `
# General Instructions
- You live inside a text editor tool that I have built.  This tool is similar to vscode but it is not for writing code, and is focused on knowledge work.
`

const FILE_SYSTEM_PROMPT = `
# File System Instructions
- You have access to the filesystem via tools.
- You will review all the files available to you when we begin our conversation.
- If you are unable to find any files, you can say so instead of assuming they exist.
- If a file changes during our conversation, review it and adjust your recommendations accordingly.
- You can read, write, create, and delete files as needed.
- When reading files, only read what you need to answer the user's questions.
- When writing files, ensure they are well-formatted and adhere to best practices.
- Only produce files that are markdown or html, never ask if I want other file types.
`

const RESUME_ASSISTANT_PROMPT = `
# Your Role
You are a professional career coach that helps me create job application materials.
You can suggest information that would be useful in helping me get hired.
You have discussions with me and help me create and improve job application materials.
`

const GENERAL_ASSISTANT_PROMPT = `
# Your Role
You are an general knowledge assistant that helps me with a variety of tasks.
`

const VOICE_AND_TONE_PROMPT = `
# Writing Style
## Purpose
Use this template to produce clear, calm, and persuasive writing that mirrors the samples.

Lead with a thesis, develop it with concrete examples or contrasts, use at most one clarifying analogy, and close with a grounded takeaway.

## Voice
- Thoughtful, calm, and earnest 
- Pragmatic and grounded, favoring clarity over flourish
- Confident without hype

## Tone
- Measured and reflective
- Respectful and balanced, even on contentious topics
- Mildly persuasive through examples and structure

## Style
- Diction: Plain language with precise terms when helpful. Minimal jargon.
- Sentence length: Mostly medium, with occasional short sentences for emphasis.
- Contractions: Prefer minimal or none (cannot, do not, is not).
- Punctuation: Standard punctuation with Oxford commas. Correct hyphenation.


## Devices:
- Use analogies sparingly, only to clarify the core point.
- Use rhetorical questions sparingly to engage or pivot.
- Use parallel structure and clean contrasts.
- Perspective: First person for personal statements, third person for expository or historical content.
- Register: Accessible general-audience register. No slang. No dramatics.

## Structure
- Thesis in the first 1 to 2 sentences
- Development: specific examples, contrasts, or brief data points
- Optional single analogy to reframe the core point
- Clear transitions between paragraphs
- Grounded conclusion that reinforces the thesis

## Do
- Lead with the point, then prove it with one or two specifics
- Keep paragraphs focused around a single idea
- Use parentheses for short clarifications when helpful (i.e., or e.g.)
- Maintain a steady cadence and clear transitions

## Do not
- Do not rely on flourish, slang, or exclamation points
- Do not overuse metaphors or rhetorical questions
- Do not stack long sentences without a shorter reset

## Pre-publish checklist
- Thesis appears in the opening
- One concrete example or contrast supports it
- At most one analogy
- Clean punctuation, correct hyphenation, Oxford commas
- Minimal or no contractions
- Simple, grounded takeaway in the final sentence
`

class MyAgent {
  private agent: Agent;
  private agentId: string;
  private mcpServer: MCPServerStdio | null = null;
  projectName: string;

  constructor(projectName: string, folders: string[], agentId: string = "a0") {
    console.log("Initializing MCP server for project:", folders, "with agentId:", agentId);

    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Provide it via environment at launch time.");
    }
    setDefaultOpenAIKey(import.meta.env.VITE_OPENAI_API_KEY);

    this.projectName = projectName;
    this.mcpServer = folders.length > 0 ? this.CreateServer(folders) : null;
    this.agentId = agentId;

    this.agent = this.CreateAgent(this.mcpServer);
    this.mcpServer?.connect();
  }

  destroy() {
    console.log("Closing MCP server");
    this.mcpServer?.close();
  }

  private PromptConstructor(agentId: string): string {
    let prompt = GENERAL_SYSTEM_PROMPT;
    if ( agentId === "a1" ) {
      prompt = RESUME_ASSISTANT_PROMPT + prompt;
    } else {
      prompt = GENERAL_ASSISTANT_PROMPT + prompt;
    }
    prompt = prompt + FILE_SYSTEM_PROMPT + VOICE_AND_TONE_PROMPT;
    console.log("Constructed prompt: ", prompt);
    return prompt;
  }

  private CreateAgent(mcpServer: MCPServerStdio | null): Agent {
    const result =  new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: this.PromptConstructor(this.agentId),
      mcpServers: mcpServer ? [mcpServer] : []
    });
    return result;
  }

  private CreateServer(folders: string[]) {
    const projectDirs = folders;

    if ( this.mcpServer ) this.destroy();

    const server = new MCPServerStdio({
      name: 'Filesystem MCP Server, via npx',
      fullCommand: `npx -y ${import.meta.env.VITE_MCP_SERVER_PATH} ${projectDirs.join(' ')}`,
    });
    server.connect();
    return server
  };
  
  async runStream(userQuery: string, previousResponseId: string | null) {
    console.log("Running agent with query (stream):", userQuery);

    try {
      const streamedResult = await run(this.agent, userQuery, { previousResponseId: previousResponseId ? previousResponseId : undefined, stream: true, maxTurns: 20 });

      // Convert string chunks to Uint8Array for broader BodyInit compatibility (Node + Edge runtimes).
      const encoder = new TextEncoder();

      async function* makeIterator() {
        for await (const event of streamedResult) {
          const rsp = wrapStreamRsp(event);
          if ( rsp ) yield encoder.encode(rsp.length + ":"+ rsp);
        }

        // Indicate the end of the stream with a special message.
        if ( streamedResult.finalOutput ) {
        const finalRsp = JSON.stringify({final: {lastResponseId: streamedResult.lastResponseId, finalOutput: streamedResult.finalOutput, originalQuery: userQuery}});
          yield encoder.encode(finalRsp.length + ":" + finalRsp);
        }
      }
     
      return makeIterator();
    } catch (error) {
      console.error("Error during agent runStream:", error);
    }
  }
}

function wrapStreamRsp(event: RunStreamEvent) {
  // console.log("Stream event: ", event.type);
  // these are the raw events from the model
  if (event.type === 'raw_model_stream_event') {
    // console.log("** raw model stream event **");
    // console.log("event.data: %o", event.data);
    if ( event.data?.type === 'response_started') return JSON.stringify({modelAction: 'started'});
    if ( event.data?.type === 'response_done') return JSON.stringify({modelAction: 'done'});
    if (event.data?.type === 'output_text_delta' && event.data?.delta) return JSON.stringify({message_chunk: event.data.delta});

    if ( event.data?.type === 'model') {
      if (event.data.event.type === 'response.created') {
        // console.log("*** Created the agent with responseId ", event.data.event.responseId);
      }
      if (event.data.event.type === 'response.output_item.added') {
        return JSON.stringify({using_tool: event.data.event.item.name ?? event.data.event.item.type});
      }
      if (event.data.event.type === 'response.completed') {
        // console.log("*** Completed the agent with responseId ", event.data.event.responseId)
      }
    }
  }
  // agent updated events
  if (event.type === 'agent_updated_stream_event') {
    // console.log("** agent updated stream event **");
    // console.log("event.agent: %o", event.agent);
  }
  // Agent SDK specific events
  if (event.type === 'run_item_stream_event') {
    // console.log("** run item stream event **");
    // console.log("event.item: %o, event.name: %o", event.item, event.name);
    if (event.name === 'message_output_created') {
      // console.log(`Message output created`);
    }
  }

  return null;
}

export { MyAgent };