import { DynamicStructuredTool } from "langchain";
import { ToolInputSchemaBase } from "@langchain/core/dist/tools/types";
import { selectThemeByLesson } from "./select-lesson-theme-tool";
import { createAdvanceLearningTool } from "./advance-learning-tool";
export type Tooling = {
    listOfTools: DynamicStructuredTool<ToolInputSchemaBase, any, any, any, unknown, string>[]
}
export const getMCPTools = async () => {

    return {
        listOfTools:
            [
                selectThemeByLesson(),
                createAdvanceLearningTool(),
            ]
    } as Tooling;
}