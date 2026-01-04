import * as cdk from 'aws-cdk-lib';

import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';


interface DynamoStackProps extends cdk.StackProps { 
  envName: string;
}

export class DynamoStack extends cdk.Stack {


  public readonly petsTable: dynamodb.Table;
  public readonly healthRecordsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly stripeEventsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoStackProps) {
    super(scope, id, props);

    const { envName } = props;

    /**
     * 1️⃣ USERS
     * Responsável pelos dados do dono do pet
     * PK: USER#<userId>
     */
    this.usersTable = new dynamodb.Table(this, `UsersTable-${envName}`, {
      tableName: `Users-${envName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // ⚠️ somente dev
    });

    /**
     * 2️⃣ PETS
     * Cada pet pertence a um usuário
     * PK: USER#<userId>
     * SK: PET#<petId>
     */
    this.petsTable = new dynamodb.Table(this, `PetsTable-${envName}`, {
      tableName: `Pets-${envName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * 3️⃣ HEALTH RECORDS
     * Vacinas e cuidados recorrentes
     * PK: PET#<petId>
     * SK: RECORD#<timestamp>
     */
    this.healthRecordsTable = new dynamodb.Table(this, `HealthRecordsTable-${envName}`, {
      tableName: `HealthRecords-${envName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * 4️⃣ REMINDERS QUEUE
     * Fila de lembretes (email hoje, WhatsApp amanhã)
     * PK: REMINDER#<date>
     * SK: <recordId>
     * TTL: expiresAt
     */
    const remindersQueueTable = new dynamodb.Table(this, `RemindersQueueTable-${envName}`, {
      tableName: `RemindersQueue-${envName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });





    this.stripeEventsTable = new dynamodb.Table(this, `StripeEvents-${envName}`, {
      tableName: `stripe-events-${envName}`,
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });



    /**
     * Outputs (opcional, mas ajuda MUITO)
     */
    new cdk.CfnOutput(this, `UsersTableName-${envName}`, {
      value: this.usersTable.tableName,
    });

    new cdk.CfnOutput(this, `PetsTableName-${envName}`, {
      value: this.petsTable.tableName,
    });

    new cdk.CfnOutput(this, `HealthRecordsTableName-${envName}`, {
      value: this.healthRecordsTable.tableName,
    });

    new cdk.CfnOutput(this, `RemindersQueueTableName-${envName}`, {
      value: remindersQueueTable.tableName,
    });


    new cdk.CfnOutput(this, `StripeEventsTableName-${envName}`, {
      value: this.stripeEventsTable.tableName,
    });
  }
}
