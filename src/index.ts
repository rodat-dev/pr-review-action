import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
    try {
        const token = core.getInput('github-token');
        const octokit = github.getOctokit(token);
        const context = github.context;

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

        // Process each changed file
        for (const file of changedFiles) {
            core.info(`\nFile: ${file.filename}`);
            core.info(`Status: ${file.status}`); // added, modified, removed
            
            // If file wasn't deleted, get its content
            if (file.status !== 'removed') {
                const { data: fileContent } = await octokit.rest.repos.getContent({
                    ...context.repo,
                    path: file.filename,
                    ref: context.payload.pull_request.head.sha
                });

                // Content is base64 encoded
                if ("content" in fileContent) {
                    const decodedContent = Buffer.from(fileContent.content, 'base64').toString();
                    core.info(`Content:\n${decodedContent}`);
                }
            }
        }

    } catch (error) {
        const err = error as Error;
        core.setFailed(err.message);
    }
}

run();