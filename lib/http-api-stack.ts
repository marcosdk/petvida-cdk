import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';


interface HttpApiStackProps extends cdk.StackProps {
  envName: string;
}

export class HttpApiStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: HttpApiStackProps) {
    super(scope, id, props);

    const { envName } = props;

    this.httpApi = new apigwv2.HttpApi(this, `HttpApi-${envName}`, {
      apiName: `petvida-http-api-${envName}`,
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });
  }
}
