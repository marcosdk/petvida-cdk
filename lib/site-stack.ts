import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { S3StaticWebsiteOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cdk from 'aws-cdk-lib';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';


interface SiteStackProps extends StackProps {
  envName: string;  
}

export class SiteStack extends Stack {

  public readonly bucketFoto: s3.Bucket;
  public readonly distributionFoto: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: SiteStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const bucketName = `petvida-site-bucket-${props.envName}`;

    
    
    const bucket = new s3.Bucket(this, `PetvidaSiteBucket-${envName}`, {
      bucketName: bucketName,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',      
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    }),
    });

   
    const distribution = new cloudfront.Distribution(this, `SiteDist-${envName}`, {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new S3StaticWebsiteOrigin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // Exibe a URL do CloudFront
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'URL de acesso via CloudFront',
    });


    this.bucketFoto = new s3.Bucket(this, `PetImagesBucket-${envName}`, {
      bucketName: `petvida-images-${envName}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,    
      autoDeleteObjects: true,

      // 👇 CORS PARA UPLOAD VIA BROWSER
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.PUT,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'], // em prod, restrinja para seu domínio
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag'],
          maxAge: 3000,
        },
      ],
    });




    this.distributionFoto = new cloudfront.Distribution(this, `ImagesCDN-${envName}`, {
        defaultBehavior: {
            origin: new origins.S3Origin(this.bucketFoto), // 👈 OAC automático
            viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        });


    this.bucketFoto.addToResourcePolicy(
        new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [`${this.bucketFoto.bucketArn}/*`],
            principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
            conditions: {
            StringEquals: {
                'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${this.distributionFoto.distributionId}`,
            },
            },
        })
        );


   
    }   

   
}