export type DependencyCategory =
  | "production"
  | "development"
  | "peer"
  | "optional";

export type Dependency = {
  name: string;
  version: string;
  type: DependencyCategory;
};

export type PackageManifest = {
  path: string;
  packageName: string | null;
  packageManager: string | null;
  totalDependencies: number;
  productionCount: number;
  developmentCount: number;
  peerCount: number;
  optionalCount: number;
  dependencies: Dependency[];
};

export type DependenciesAnalysisData = {
  available: boolean;
  manifestFound: boolean;
  manifestCount: number;
  manifestPaths: string[];
  manifests: PackageManifest[];
  totalDependencies: number;
  productionCount: number;
  developmentCount: number;
  peerCount: number;
  optionalCount: number;
  dependencies: Dependency[];
  truncated: boolean;
};