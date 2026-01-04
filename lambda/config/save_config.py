import json
import os
import boto3
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])

def lambda_handler(event, context):
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        user_id = claims["sub"]

        body = json.loads(event["body"])

        pk = f"USER#{user_id}"
        sk = "PROFILE"

        table.update_item(
            Key={
                "PK": pk,
                "SK": sk
            },
            UpdateExpression="""
                SET preferences = :prefs,
                    updated_at = :updatedAt
            """,
            ExpressionAttributeValues={
                ":prefs": {
                    "remindersEnabled": body.get("remindersEnabled", False),
                    "emailNotifications": body.get("emailNotifications", False),
                    "advanceDays": body.get("advanceDays", "7"),
                },
                ":updatedAt": datetime.utcnow().isoformat()
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Configurações atualizadas com sucesso"})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
