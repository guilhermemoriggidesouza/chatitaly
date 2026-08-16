import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { getMongoDBTool } from "./mongo-db-tools";
import { DynamicStructuredTool } from "langchain";
import { ToolInputSchemaBase } from "@langchain/core/dist/tools/types";
import logger from '../logger';
export type Tooling = {
    listOfTools: DynamicStructuredTool<ToolInputSchemaBase, any, any, any, unknown, string>[]
}
export const getMCPTools = async () => {
    const client = new MultiServerMCPClient({
        mcpServers: {
            ...getMongoDBTool(),
        },
        onMessage: (log, src) => {
            logger.info({ source: src, log }, 'MCP message');
        }
    })

    const mcpTools = await client.getTools()

    return {
        listOfTools:
            [
                ...mcpTools,
            ]
    } as Tooling;
}