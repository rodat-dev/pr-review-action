declare type ChangedFile = {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    blob_url: string;
    raw_url: string;
    contents_url: string;
    patch: string;
};

declare type FileStatus = "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";

declare type ChangedFileStatusTuple = [ChangedFile, FileStatus];

declare type RepositoryInformation = {
    owner: string;
    repo: string;
}