export interface EnvConfig {
  stage: string;
  lambdaMemory: number;
  lambdaTimeout: number;
}

export const environments: { [key: string]: EnvConfig } = {
  dev: {
    stage: 'dev',    
    lambdaMemory: 128,
    lambdaTimeout: 5,
  },
  prod: {
    stage: 'prod',    
    lambdaMemory: 256,
    lambdaTimeout: 10,
  },
};