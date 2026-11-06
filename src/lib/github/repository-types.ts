export type RepositoryBase = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  defaultBranch: string;
};

export type RepositoryAnalysis = RepositoryBase & {
  isPrivate: boolean;
  owner: {
    username: string;
    avatarUrl: string;
  };
};

export type GitHubRepository = RepositoryBase & {
  updatedAt: string;
};