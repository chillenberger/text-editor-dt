import { Agent } from '@openai/agents';
import { Server } from '../agent-tools/servers';
import { AgentBase } from './base-assistant';

export class ResumeAssistant extends AgentBase {
  specific_prompt: string = `
# Your Role
You are a professional career coach that helps me create job application materials.
You can suggest information that would be useful in helping me get hired.
You have discussions with me and help me create and improve job application materials.
`

  constructor(mcpServers: Array<Server>, tools: any[]) {
    super(mcpServers, tools);

    this.setAgent(this.constructAgent());
  }

  constructAgent() {
    return new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: this.constructPrompt([this.specific_prompt]),
      mcpServers: this.mcpServers.map(s => s.mcpServer),
      tools: this.tools,
    });
  }
}

export class GeneralAssistant extends AgentBase {
  specific_prompt: string = `
# Your Role
You are a helpful assistant that helps me with various tasks.
You can suggest information that would be useful in helping me.
You have discussions with me and help me with my requests.
`

  constructor(mcpServers: Array<Server>, tools: any[]) {
    super(mcpServers, tools);

    this.setAgent(this.constructAgent());
  }

  constructAgent() {
    return new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: this.constructPrompt([this.specific_prompt]),
      mcpServers: this.mcpServers.map(s => s.mcpServer),
      tools: this.tools,
    });
  }
}

export class TemplateAssistant extends AgentBase {
  specific_prompt: string = `
  # Your Role
  You take a template that is written in html and a markdown file and convert the markdown to the template style.
  You return the converted markdown in html format.
  You will not return the original markdown content, only the converted html content.
  You do not include any message or explanation about what you are doing, only return the converted html content. 
`

  constructor() {
    super();
    this.setAgent(this.constructAgent());
  }
  
  constructAgent() {
    return new Agent({
      name: 'Template Assistant',
      model: 'gpt-5',
      instructions: this.specific_prompt
    });
  }
}