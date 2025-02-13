# Pull Request Review Action - GitHub Action

A GitHub Action that uses Google's Gemini AI to analyze pull requests and identify potential bugs, performance improvements, and suggest code enhancements.

## Features

- 🔍 Automatically analyzes pull requests when they are opened or reopened
- 🐛 Identifies potential bugs in code changes
- ⚡ Suggests performance optimizations
- 💡 Provides intelligent code improvement suggestions
- 🤖 Powered by Google's Gemini AI model

## Setup

1. Add this action to your repository's workflow:

```yaml
on:
  pull_request:
    types: [opened, reopened]

jobs:
  pr_review:
    runs-on: ubuntu-latest
    name: A job to review a PR with an LLM
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - name: Checkout action
        uses: actions/checkout@v4
      - name: Pull Request Reviewer
        uses: rodat-dev/pr-review-action@v1.0.1
        id: pr_review
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - name: Get the output time
        run: echo "The time was ${{ steps.review_pr.outputs.time }}"
```

2. Set up the required secrets in your repository:
   - `GITHUB_TOKEN`: Automatically provided by GitHub
   - `GEMINI_API_KEY`: Your Google Gemini API key

## How it Works

When a pull request is opened or reopened, the action:

1. Retrieves the changes made in the pull request
2. Analyzes the code changes using Gemini AI
3. Generates a detailed review that includes:
   - Initial analysis of changes
   - Potential bugs and issues
   - Performance optimization suggestions
   - Code improvement recommendations
   - Confidence score for the suggestions

## Dependencies

- `@actions/core`: ^1.10.1
- `@actions/github`: ^6.0.0
- `@google/generative-ai`: ^0.11.5
- `mustache`: ^4.2.0

## Development

```bash
# Install dependencies
bun install

# Build the action
bun run build

# Compile the action
bun run compile
```

## License

This project is licensed under the terms specified in the repository's license file.
