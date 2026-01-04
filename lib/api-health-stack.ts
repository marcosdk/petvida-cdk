import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';


interface ApiHealthStackProps extends cdk.StackProps {
  envName: string;
  healthTable: dynamodb.Table;
  httpApi: apigwv2.HttpApi;  
  cognitoAuthorizer: apigwv2_authorizers.HttpJwtAuthorizer;

}

export class ApiHealthStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiHealthStackProps) {
    super(scope, id, props);

    const { healthTable, httpApi, cognitoAuthorizer } = props;
    const { envName } = props;

    /**
     * POST Vaccine Lambda
     */
    const postVaccineLambda = new lambda.Function(this, `PostVaccine-${envName}`, {
      description: `Criado em ${new Date().toISOString()}`,
      functionName: `PostVaccine-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'post_vaccine.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/health')
      ),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        HEALTH_RECORDS_TABLE: healthTable.tableName,
      },
    });

    healthTable.grantWriteData(postVaccineLambda);


    httpApi.addRoutes({
      path: '/api/vaccines',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        `PostVaccineIntegration-${envName}`,
        postVaccineLambda
      ),
      authorizer: cognitoAuthorizer,
    });



     /**
     * GET Vaccine Lambda
     */
    const listVaccinesLambda = new lambda.Function(this, `ListVaccines-${envName}`, {
      description: `Criado em ${new Date().toISOString()}`,
      functionName: `ListVaccines-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'list_vaccines.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/health')
      ),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        HEALTH_RECORDS_TABLE: healthTable.tableName,
      },
    });

    healthTable.grantReadData(listVaccinesLambda);

    httpApi.addRoutes({
      path: '/api/vaccines',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        `ListVaccinesIntegration-${envName}`,
        listVaccinesLambda
      ),
      authorizer: cognitoAuthorizer,
    });



    /**
     * POST Care Lambda
     */
    const postCareLambda = new lambda.Function(this, `PostCare-${envName}`, {
      description: `Criado em ${new Date().toISOString()}`,
      functionName: `PostCare-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'post_care.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/health')
      ),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        HEALTH_RECORDS_TABLE: healthTable.tableName,
      },
    });

    healthTable.grantWriteData(postCareLambda);

    httpApi.addRoutes({
      path: '/api/care',
      methods: [apigwv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        `PostCareIntegration-${envName}`,
        postCareLambda
      ),
      authorizer: cognitoAuthorizer,
    });



    /**
     * GET Care Lambda
     */
    const getCareLambda = new lambda.Function(this, `GetCare-${envName}`, {
      description: `Criado em ${new Date().toISOString()}`,
      functionName: `GetCare-${envName}`,
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: 'get_care.lambda_handler',
      code: lambda.Code.fromAsset(
        path.join(__dirname, '../lambda/health')
      ),
      timeout: Duration.seconds(10),
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        HEALTH_RECORDS_TABLE: healthTable.tableName,
      },
    });

    healthTable.grantReadData(getCareLambda);

    httpApi.addRoutes({
      path: '/api/care',
      methods: [apigwv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        `GetCareIntegration-${envName}`,
        getCareLambda
      ),
      authorizer: cognitoAuthorizer,
    });





  } // fim do construtor    
}// fim da classe