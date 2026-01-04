#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
//import { PetvidaCdkStack } from '../lib/petvida-cdk-stack';
import { SiteStack } from '../lib/site-stack';
import { environments } from '../lib/config/environments';
import { DynamoStack } from '../lib/dynamo-stack';
import { HttpApiStack } from '../lib/http-api-stack';
import { ApiPetStack } from '../lib/api-pet-stack';
import { ApiHealthStack } from '../lib/api-health-stack';
import { ApiAuthStack } from '../lib/api-auth-stack';
import * as dotenv from 'dotenv';
import { ApiConfigUserPetVidaStack } from '../lib/api-configUserPetVida-stack';

dotenv.config();

const app = new cdk.App();


const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = 'sa-east-1';



const stage = app.node.tryGetContext('stage') || 'dev';
const configEnv = environments[stage];

const siteStack = new SiteStack(app, `${configEnv.stage}-SiteStack`, {
  env: { account, region },
  envName: configEnv.stage
  
});


const dynamoStack = new DynamoStack(app, `${configEnv.stage}-DynamoStack`, {
  env: { account, region },
  envName: configEnv.stage
  
});


const httpApiStack = new HttpApiStack(app, `${stage}-HttpApiStack`, {
  env: { account, region },
  envName: stage,
});


const apiAuthStack = new ApiAuthStack(app, `${stage}-ApiAuthStack`, {
  env: { account, region },
  envName: stage,
  usersTable: dynamoStack.usersTable,
  stripeEventsTable: dynamoStack.stripeEventsTable,
  httpApi: httpApiStack.httpApi  
});


new ApiConfigUserPetVidaStack(app, `${stage}-ApiConfigUserPetVidaStack`, {
  env: { account, region },
  envName: stage,
  usersTable: dynamoStack.usersTable,
  httpApi: httpApiStack.httpApi,  
  cognitoAuthorizer: apiAuthStack.cognitoAuthorizer
});


new ApiPetStack(app, `${stage}-ApiPetStack`, {
  env: { account, region },
  envName: stage,
  petsTable: dynamoStack.petsTable,
  httpApi: httpApiStack.httpApi,
  bucketFoto: siteStack.bucketFoto,
  distributionFoto: siteStack.distributionFoto,
  cognitoAuthorizer: apiAuthStack.cognitoAuthorizer
});


new ApiHealthStack(app, `${stage}-ApiHealthStack`, {
  env: { account, region },
  envName: stage,
  healthTable: dynamoStack.healthRecordsTable,
  httpApi: httpApiStack.httpApi,
  cognitoAuthorizer: apiAuthStack.cognitoAuthorizer  
});