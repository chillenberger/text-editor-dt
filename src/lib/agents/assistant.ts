import { Agent } from '@openai/agents'
import { Server } from '../agent-tools/servers'
import { AgentBase } from './base-assistant'

export class ResumeAssistant extends AgentBase {
  specific_prompt: string = `
# Your Role
You are a professional career coach that helps me create job application materials.
You can suggest information that would be useful in helping me get hired.
You have discussions with me and help me create and improve job application materials.
`

  constructor(mcpServers: Array<Server>, tools: any[]) {
    super(mcpServers, tools)

    this.setAgent(this.constructAgent())
  }

  constructAgent() {
    return new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: this.constructPrompt([this.specific_prompt]),
      mcpServers: this.mcpServers.map((s) => s.mcpServer),
      tools: this.tools
    })
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
    super(mcpServers, tools)

    this.setAgent(this.constructAgent())
  }

  constructAgent() {
    return new Agent({
      name: 'FS MCP Assistant',
      model: 'gpt-5',
      instructions: this.constructPrompt([this.specific_prompt]),
      mcpServers: this.mcpServers.map((s) => s.mcpServer),
      tools: this.tools
    })
  }
}

export class TemplateAssistant extends AgentBase {
  specific_prompt: string = `
  # Your Role
  You are an expert Document Formatter and Web Developer. Your goal is to convert a raw Markdown document into a polished HTML document that perfectly matches a provided HTML Template, while also injecting personal user data where appropriate.

  # Inputs
  You will receive a JSON object containing:
  1. "markdown": The content to be formatted.
  2. "template": An HTML string representing the desired style and structure. 
  3. "userData": A JSON object containing the user's personal information (name, contact, links, etc.).

  # Instructions
  1. **Analyze the Template**: Understand the structure, CSS classes, and layout of the "template". Identify where the main content goes and where the header/personal info is displayed.
  2. **Inject User Data**: 
     - Look for placeholders or standard header sections in the "template" (e.g., Name, Email, LinkedIn). 
     - Replace these with the corresponding values from "userData".
     - If the template has a section for personal info but the specific data is missing, remove that specific element cleanly.
  3. **Convert Content**: 
     - Transform the "markdown" content into HTML.
     - **CRITICAL**: Apply the exact CSS classes and hierarchy found in the "template" to your converted content. For example, if the template uses \`<h1 class="title">\` for the main title, your output must use that exact class.
     - Ensure valid HTML structure.
  4. **Merge**: Combine the injected header/personal info and the converted content body into a single, complete HTML document.

  # Output constraints
  - Return ONLY the final HTML string.
  - Do NOT wrap the output in markdown code blocks (e.g., no \`\`\`html).
  - Do NOT include any conversational text, explanations, or preambles.
  - The output should be ready to save directly as an .html file.
`

  constructor() {
    super()
    this.setAgent(this.constructAgent())
  }

  constructAgent() {
    return new Agent({
      name: 'Template Assistant',
      model: 'gpt-5',
      instructions: this.specific_prompt
    })
  }
}
