import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Duration } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigwv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';



interface ApiAuthStackProps extends cdk.StackProps {
  envName: string;
  usersTable: dynamodb.Table;
  stripeEventsTable: dynamodb.Table;
  httpApi: apigwv2.HttpApi;
}

export class ApiAuthStack extends cdk.Stack {

  public readonly cognitoAuthorizer: apigwv2_authorizers.HttpJwtAuthorizer;
  constructor(scope: Construct, id: string, props: ApiAuthStackProps) {
    super(scope, id, props);

    const { usersTable, stripeEventsTable, httpApi } = props;
    const { envName } = props;

    const userPool = new cognito.UserPool(this, `UserPool-${envName}`, {
        userPoolName: `PetApp-Users-${envName}`,
        selfSignUpEnabled: true,
        signInAliases: {
            email: true,
        },
        autoVerify: {
            email: true,
        },
        passwordPolicy: {
            minLength: 6,
            requireDigits: false,
            requireLowercase: false,
            requireUppercase: false,
            requireSymbols: false,
        },
        removalPolicy: cdk.RemovalPolicy.DESTROY, 


        userVerification: {
            emailSubject: 'Confirme seu e-mail | PetVida',
            emailBody: `
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                    <td align="center">
                        <table width="500" style="background:#ffffff;border-radius:8px;padding:20px">
                        <tr>
                            <td align="center">
                            <img 
                                src="https://meusite.com/logo.png" 
                                alt="Logo"
                                width="120"
                                style="margin-bottom:20px"
                            />
                            </td>
                        </tr>
                        <tr>
                            <td>
                            <h2 style="color:#2196f3">Confirme seu e-mail</h2>
                            <p style="color:#555">
                                Falta só mais um passo para ativar sua conta.
                            </p>

                            <p style="font-size:18px; margin:30px 0;">
                                <strong>Código:</strong>
                                <span style="color:#2196f3">{####}</span>
                            </p>

                            <p style="color:#999;font-size:12px">
                                Se você não criou uma conta, ignore este e-mail.
                            </p>
                            </td>
                        </tr>
                        </table>
                    </td>
                    </tr>
                </table>
                </body>
            </html>
            `,
            emailStyle: cognito.VerificationEmailStyle.CODE,
        },
    });

    const userPoolClient = userPool.addClient(`UserPoolClient-${envName}`, {
        authFlows: {
            userPassword: true,
            userSrp: true,
            adminUserPassword: true, // 🔥 OBRIGATÓRIO
        },
        
    });

    this.cognitoAuthorizer = new apigwv2_authorizers.HttpJwtAuthorizer(
        `CognitoAuthorizer-${envName}`,
        `https://cognito-idp.${cdk.Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}`,
        {
            jwtAudience: [userPoolClient.userPoolClientId],
        }
    );


    const stripeLayer = new lambda.LayerVersion(this, `StripeLayer-${envName}`, {
        code: lambda.Code.fromAsset(path.join(__dirname, '../layers/stripe')),
        compatibleRuntimes: [lambda.Runtime.PYTHON_3_13],
        description: 'Stripe SDK',
    });


    /*
    * Register User Lambda
    */
    const registerUserLambda = new lambda.Function(this, `RegisterUser-${envName}`, {
        description: `Register user - ${new Date().toISOString()}`,
        functionName: `RegisterUser-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'register_user.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
        timeout: Duration.seconds(20),
        logRetention: logs.RetentionDays.ONE_WEEK,
        layers: [stripeLayer],
        environment: {            
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
            STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID!,
            FRONTEND_URL: process.env.FRONTEND_URL!,
        },
    });

    usersTable.grantWriteData(registerUserLambda);

    registerUserLambda.addToRolePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminSetUserPassword',
            ],
            resources: [userPool.userPoolArn],
        })
    );

    httpApi.addRoutes({
        path: '/api/auth/register',
        methods: [apigwv2.HttpMethod.POST],
        integration: new integrations.HttpLambdaIntegration(
            `RegisterUserIntegration-${envName}`,
            registerUserLambda
        ),
    });


    /*
    * Login User Lambda
    */
    const loginUserLambda = new lambda.Function(this, `LoginUser-${envName}`, {
        description: `Login user - ${new Date().toISOString()}`,
        functionName: `LoginUser-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'login_user.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
        timeout: Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment: {
            USER_POOL_ID: userPool.userPoolId,
            CLIENT_ID: userPoolClient.userPoolClientId,
        },
    });

    loginUserLambda.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['cognito-idp:AdminInitiateAuth'],
            resources: [userPool.userPoolArn],
        })
    );

    httpApi.addRoutes({
        path: '/api/auth/login',
        methods: [apigwv2.HttpMethod.POST],
        integration: new integrations.HttpLambdaIntegration(
            `LoginUserIntegration-${envName}`,
            loginUserLambda
        ),
    });




    const stripeWebhookLambda = new lambda.Function(this, `StripeWebhook-${envName}`, {
        description: `Criado em - ${new Date().toISOString()}`,
        functionName: `StripeWebhook-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'stripe_webhook.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
        timeout: Duration.seconds(15),
        logRetention: logs.RetentionDays.ONE_WEEK,
        layers: [stripeLayer],
        environment: {
            STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY!,
            STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,
            STRIPE_EVENTS_TABLE: stripeEventsTable.tableName,

            USER_POOL_ID: userPool.userPoolId,
            CLIENT_ID: userPoolClient.userPoolClientId,
            USERS_TABLE: usersTable.tableName,
        },
    });


    usersTable.grantWriteData(stripeWebhookLambda);

    stripeWebhookLambda.addToRolePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
            'cognito-idp:AdminCreateUser',
            'cognito-idp:AdminSetUserPassword',
            ],
            resources: [userPool.userPoolArn],
        })
    );

    stripeEventsTable.grantWriteData(stripeWebhookLambda);

    httpApi.addRoutes({
        path: '/api/stripe/webhook',
        methods: [apigwv2.HttpMethod.POST],
        integration: new integrations.HttpLambdaIntegration(
            `StripeWebhookIntegration-${envName}`,
            stripeWebhookLambda
        ),
    });




    /*
    * Set Password Lambda
    */
    const setPasswordLambda = new lambda.Function(this, `SetPassword-${envName}`, {
        description: `Set user password - ${new Date().toISOString()}`,
        functionName: `SetPassword-${envName}`,
        runtime: lambda.Runtime.PYTHON_3_13,
        handler: 'set_password.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
        timeout: Duration.seconds(10),
        logRetention: logs.RetentionDays.ONE_WEEK,
        environment: {
            USER_POOL_ID: userPool.userPoolId,
        },
    });

    setPasswordLambda.addToRolePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
            'cognito-idp:AdminSetUserPassword',
            ],
            resources: [userPool.userPoolArn],
        })
    );

    httpApi.addRoutes({
        path: '/api/auth/set-password',
        methods: [apigwv2.HttpMethod.POST],
        integration: new integrations.HttpLambdaIntegration(
            `SetPasswordIntegration-${envName}`,
            setPasswordLambda
        ),
    });


  } // fim do construtor
}// fim do componente