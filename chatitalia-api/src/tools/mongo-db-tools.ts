import { mongodb } from "../config"

export const getMongoDBTool = () => {
    return {
        "MongoDB": {
            transport: 'stdio' as const,
            "command": "npx",
            "args": ["-y", "mongodb-mcp-server@latest", "--readOnly"],
            "env": {
                "MDB_MCP_CONNECTION_STRING": mongodb.uri + `/` + mongodb.dbName
            }
        }
    }
}