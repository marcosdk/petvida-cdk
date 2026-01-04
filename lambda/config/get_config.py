import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["USERS_TABLE_NAME"])

def lambda_handler(event, context):
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        user_id = claims["sub"]

        pk = f"USER#{user_id}"
        sk = "PROFILE"

        response = table.get_item(
            Key={
                "PK": pk,
                "SK": sk
            }
        )

        if "Item" not in response:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "name": claims.get("name"),
                    "email": claims.get("email"),
                    "preferences": {
                        "remindersEnabled": False,
                        "emailNotifications": False,
                        "advanceDays": "7"
                    }
                })
            }

        item = response["Item"]

        return {
            "statusCode": 200,
            "body": json.dumps({
                "name": item.get("name"),
                "email": item.get("email"),
                "preferences": item.get("preferences", {
                    "remindersEnabled": False,
                    "emailNotifications": False,
                    "advanceDays": "7"
                })
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
