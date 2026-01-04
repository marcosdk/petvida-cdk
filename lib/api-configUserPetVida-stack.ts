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


interface ApiConfigUserPetVidaStackProps extends cdk.StackProps {
  envName: string;
  usersTable: dynamodb.Table;
  httpApi: apigwv2.HttpApi;  
  cognitoAuthorizer: apigwv2_authorizers.HttpJwtAuthorizer;
  

}


export class ApiConfigUserPetVidaStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: ApiConfigUserPetVidaStackProps) {
        super(scope, id, props);
  
        const { usersTable, httpApi, cognitoAuthorizer } = props;
        const { envName } = props;

   


         /**
         * Get Config Lambda
         */
        const getConfigLambda = new lambda.Function(this, `GetConfig-${envName}`, {
            description: `Atualizado em ${new Date().toISOString()}`,
            functionName: `get-config-${envName}`,
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'get_config.lambda_handler',
            code: lambda.Code.fromAsset(
                path.join(__dirname, '../lambda/config')
            ),
            timeout: Duration.seconds(10),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
            },
        });

        usersTable.grantReadData(getConfigLambda);

        httpApi.addRoutes({
            path: '/api/config',
            methods: [apigwv2.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration(
                `GetConfigIntegration-${envName}`,
                getConfigLambda
            ),
            authorizer: cognitoAuthorizer,
        });

        /**
         * Save Config Lambda
         */
        const saveConfigLambda = new lambda.Function(this, `SaveConfig-${envName}`, {
            description: `Atualizado em ${new Date().toISOString()}`,
            functionName: `save-config-${envName}`,
            runtime: lambda.Runtime.PYTHON_3_13,
            handler: 'save_config.lambda_handler',
            code: lambda.Code.fromAsset(
                path.join(__dirname, '../lambda/config')
            ),
            timeout: Duration.seconds(10),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
            },
        });

        usersTable.grantWriteData(saveConfigLambda);

        httpApi.addRoutes({
            path: '/api/config',
            methods: [apigwv2.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration(
                `SaveConfigIntegration-${envName}`,
                saveConfigLambda
            ),
            authorizer: cognitoAuthorizer,
        });
    }

}