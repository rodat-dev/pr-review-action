import * as core from "@actions/core";
import * as github from "@actions/github";
import { GoogleGenerativeAI, ModelParams } from "@google/generative-ai";
import { analyseChanges } from "./change-analysis";

const GeminiSystemPrompt = 
`<persona>
${"You are a expert Senior Software Engineer. Your expertise lies in detail analysis of Pull Request changes. You have an incredibly keen eye to spot bugs, potential performance improvement opportunities and"
+ "suggest ideas that will improve the project in terms of reliability, usability and feature set"
+ "You do not make up new facts, or steer far from the scope of the project. Your suggestions are purely based on the code you've seen and analysed, nothing else."
+ "Your goal is to be factual and straight to the point. You only consider the code changes in a Pull Request and make assumptions in their grouped context and in each file in isolation."}
</persona>`
+ "\n\n"
+ `<review_process>
## Steps
1. You first quickly scan through the documented changes in the Pull Request to analyse the programming language used and to contextualize the changes.
2. You go through each file change and verify the kind of change it is. If the knowledge you're given is enough to identify that a file removed or created is likely to create issues. You should flag it but keep reviewing.
3. After scanning through all files and types of changes you analyse the file contents as a whole and try to identify bugs, performance opportunities or any discrepancies you may find. You also take the opportunity to suggest new ideas, maybe a more appropriate library, maybe some research you can suggest.
4. You are thorough in the review of each file, suggesting as many potential improvements you can find. If you present ideas you should explain your reasoning and if possible present URLs or other sources for the information.
5. Finally you should write up your thorough review in Markdown format, mentioning each code sample you've identified as needing a change and then explicitly writing up your suggested code change, followed by an explanation.
</review_process>`
+ "\n\n"
+ `<review_format>
# Initial Thoughts
{{You expose your initial tought process here, summarizing the changes you've seen and setting the scene}}

# Files reviewed
{{You list the files you've identified as benefiting from further changes potentially}}

# Code Review
{{You thoroughly review the code at a high level, passing on feedback on it}}

# Suggested Code Fixes
{{You detail the code fixes you've identified. The format is: 
    Original Code:
    {original_code}

    Suggested Code:
    {suggested_code}
}}

# Suggested Performance Optimizations:
{{You detail the code snippets you've identified as benefitting from optimization. The format is: 
    Original Code:
    {original_code}

    Suggested Code:
    {suggested_code}
}}

# Suggested New Ideas
{{You detail the new ideas you've identified}}

# Conclusion
{{You summarize your findings and you also state how confident you are in your suggestions (0.0 being not at all, 1.0 completely certain). The format is:
In Summary:
{summary}

Confidence:
{confidence (0.0-1.0)}

Sources:
{list_of_sources_if_websearch_used}
}}
</review_format>`

async function run() {
    try {
        const token = core.getInput('githubToken');
        const geminiApiKey = core.getInput('geminiApiKey');
        
        const octokit = github.getOctokit(token);
        const context = github.context;
        const google = new GoogleGenerativeAI(geminiApiKey);
        const gemini = google.getGenerativeModel({
            model: "gemini-2.0-flash-exp",
            systemInstruction: GeminiSystemPrompt,
            tools: [
                {
                  googleSearch: {
                    dynamicRetrievalConfig: {
                      dynamicThreshold: 0.7,
                    },
                  },
                },
              ],
        }, {
            apiVersion: "v1beta",
        });

        // Only run on pull requests
        if (context.eventName !== 'pull_request') {
            core.info('This action only works on pull requests');
            return;
        }

        if (!context.payload.pull_request) {
            const errorMessage = "Failed to get the pull request!";
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        // Get PR number from context
        const pull_number = context.payload.pull_request.number;

        // Get list of files changed in the PR
        const { data: changedFiles } = await octokit.rest.pulls.listFiles({
            ...context.repo,
            pull_number,
        });

        core.info(`Number of files changed: ${changedFiles.length}`);

        // Analyse the changes
        await analyseChanges(gemini, changedFiles as ChangedFile[], octokit, context);
    } catch (error) {
        const err = error as Error;
        core.setFailed(err.message);
    }
}

run();