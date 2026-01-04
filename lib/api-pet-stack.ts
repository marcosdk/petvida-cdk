import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';


interface ApiPetStackProps extends cdk.StackProps {
  envName: string;
  petsTable: dynamodb.Table;
  httpApi: apigwv2.HttpApi;
  
  bucketFoto: s3.Bucket;
  distributionFoto: cloudfront.Distribution;
  cognitoAuthorizer: apigwv2_authorizers.HttpJwtAuthorizer;

}

export class ApiPetStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiPetStackProps) {
    super(scope, id, props);

    const { petsTable, httpApi, bucketFoto, distributionFoto, cognitoAuthorizer } = props;
    const { envName } = props;

    /**
     * Lambda - Add Pet
     */
    const addPetLambda = new lambda.Function(this, `AddPetLambda-${envName}`, {
      description: `Atualizado em at ${new Date().toISOString()}`,
      functionName: `add-pet-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'add_pet.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/pets')
      ),
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK, // ✅ 7 dias
      environment: {
        PETS_TABLE_NAME: petsTable.tableName,
      },
    });

    petsTable.grantWriteData(addPetLambda);

    /**
     * Route: POST /api/pets
     */
    httpApi.addRoutes({
      path: '/api/pets',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        `AddPetIntegration-${envName}`,
        addPetLambda
      ),
      authorizer: cognitoAuthorizer,
    });

    /*
    *Upload Pet Photo Lambda
    */
    const uploadUrlLambda = new lambda.Function(this, `PetPhotoUploadUrl-${envName}`, {
        description: `Atualizado em at ${new Date().toISOString()}`,
        functionName: `pet-photo-upload-url-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'get_upload_url.lambda_handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/pets')),
        timeout: Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_WEEK, // ✅ 7 dias
        environment: {
            BUCKET_NAME: bucketFoto.bucketName,
            CLOUDFRONT_URL: `https://${distributionFoto.domainName}`,
        },
    });

    bucketFoto.grantPut(uploadUrlLambda);

    httpApi.addRoutes({
        path: '/api/pets/photo-upload-url',
        methods: [apigwv2.HttpMethod.POST],
        integration: new integrations.HttpLambdaIntegration(
            `PetPhotoUploadIntegration-${envName}`,
            uploadUrlLambda
        ),
        authorizer: cognitoAuthorizer,
    });




    /*
    *Get Pet Lambda
    */
    const getPetlLambda = new lambda.Function(this, `GetPet-${envName}`, {
        description: `Atualizado em at ${new Date().toISOString()}`,
        functionName: `GetPet-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'get_pet.lambda_handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/pets')),
        timeout: Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_WEEK, // ✅ 7 dias
        environment: {
            PETS_TABLE_NAME: petsTable.tableName,
        },
    });

    petsTable.grantReadData(getPetlLambda);
    

    httpApi.addRoutes({
        path: '/api/pets',
        methods: [apigwv2.HttpMethod.GET],
        integration: new integrations.HttpLambdaIntegration(
            `GetPetIntegration-${envName}`,
            getPetlLambda
        ),
        authorizer: cognitoAuthorizer,
    });



    /*
    * Get Single Pet Lambda (NOVA)
    */
    const getSinglePetLambda = new lambda.Function(this, `GetSinglePet-${envName}`, {
      description: `Atualizado em at  - ${new Date().toISOString()}`,
      functionName: `GetSinglePet-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'get_single_pet.lambda_handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/pets')),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        PETS_TABLE_NAME: petsTable.tableName,
      },
    });

    petsTable.grantReadData(getSinglePetLambda);

    httpApi.addRoutes({
      path: '/api/pets/{petId}',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        `GetSinglePetIntegration-${envName}`,
        getSinglePetLambda
      ),
      authorizer: cognitoAuthorizer,
    });




  }// end Contrutctor
}
