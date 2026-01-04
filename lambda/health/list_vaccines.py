import json
import os
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["HEALTH_RECORDS_TABLE"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}

        user_id = params.get("userId")
        pet_id = params.get("petId")

        if not user_id:
            return response(400, {
                "message": "userId é obrigatório"
            })

        pk = f"USER#{user_id}"

        if pet_id:
            sk_prefix = f"PET#{pet_id}#VACCINE#"
            result = table.query(
                KeyConditionExpression=
                    Key("PK").eq(pk) &
                    Key("SK").begins_with(sk_prefix)
            )
        else:
            result = table.query(
                KeyConditionExpression=Key("PK").eq(pk),
                 FilterExpression=Attr("type").eq("VACCINE")
            )

        items = result.get("Items", [])

        return response(200, {
            "items": items
        })

    except Exception as e:
        print("ERROR:", str(e))
        return response(500, {"message": "Internal server error"})


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
