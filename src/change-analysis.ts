import { Context } from "@actions/github/lib/context";
import { GitHub } from "@actions/github/lib/utils";
import { GenerativeModel } from "@google/generative-ai";

function organizeChanges(changedFiles: ChangedFile[]): ChangedFileStatusTuple[] {
    return changedFiles.map(file => {
        const status = file.status as FileStatus;
        return [file, status] as ChangedFileStatusTuple;
    });
}

// Function to retrieve the file contents from the PR changes
async function getFileContents(filename: string, octokit: InstanceType<typeof GitHub>, repoInfo: RepositoryInformation, sha: string) {
    const { data: fileContent } = await octokit.rest.repos.getContent({
        ...repoInfo,
        path: filename,
        ref: sha
    });

    if("content" in fileContent) {
        const decodedContent = Buffer.from(fileContent.content, 'base64').toString();
        return decodedContent;
    } else {
        return "No content";
    }
}

async function fromTupleToReadableText(files: ChangedFileStatusTuple[], octokit: InstanceType<typeof GitHub>, prNumber: number, repoInfo: RepositoryInformation, sha: string): Promise<string> {
    // Attempt to format the content in an LLM friendly format
    // TODO: can improve by checking file type and add an appropriate markdown string for the programming language
    const texts = [`# Changes in Pull Request ${prNumber}`];
    for (const [file, status] of files) {
        const fileContent = await getFileContents(file.filename, octokit, repoInfo, sha);

        const text = `
        =================================
        ## File: 
        ${file.filename}
        
        ## Status 
        ${status}

        ## File contents:
        ${fileContent}
        =================================
        `;

        texts.push(text.trim());
    }

    return texts.join("\n\n");
}

/// Function to analyze the Changes of a PR using Gemini
export async function analyzeChanges(gemini: GenerativeModel,  changedFiles: ChangedFile[], octokit: InstanceType<typeof GitHub>, context: Context) {
    if (!context.payload.pull_request) {
        throw new Error("Failed to get the pull request!");
    }

    // Sort changes by status
    const organized = organizeChanges(changedFiles);
    
    // Retrieve the file contents and Output in LLM friendly format
    const changesString = await fromTupleToReadableText(organized, octokit, context.payload.pull_request.number, context.repo, context.payload.pull_request.head.sha);
    
    // Generate a comment on the issue
    const llmOutput = await gemini.generateContent(changesString);

    // Create a review
    await octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.pull_request?.number!,
        body: llmOutput.response.text(),
        event: "COMMENT",
    });
}