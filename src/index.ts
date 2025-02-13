import * as core from "@actions/core";
import * as github from "@actions/github";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzeChanges } from "./change-analysis";
import { GeminiSystemPrompt } from "./prompt";

async function run() {
    try {
        const token = process.env.GITHUB_TOKEN;
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!token || !geminiApiKey) {
            throw new Error('Missing required environment variables. Please set GITHUB_TOKEN and GEMINI_API_KEY');
        }
        
        const octokit = github.getOctokit(token);
        const context = github.context;
        const google = new GoogleGenerativeAI(geminiApiKey);
        const modelConfig = {
            model: "gemini-2.0-flash",
            systemInstruction: GeminiSystemPrompt,
            tools: [{googleSearch: {}}],
        }
        const additionalConfig = { apiVersion: "v1beta" };
        const gemini = google.getGenerativeModel(modelConfig as unknown as any, additionalConfig);

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
        await analyzeChanges(gemini, changedFiles as ChangedFile[], octokit, context);
    } catch (error) {
        const err = error as Error;
        core.setFailed(`Action failed with error: ${err.message} - ${err.stack}`);
    }
}

run();