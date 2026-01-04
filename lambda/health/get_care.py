import json
import os
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["HEALTH_RECORDS_TABLE"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}

        user_id = params.get("userId")
        pet_id = params.get("petId")  # opcional

        if not user_id:
            return response(400, {"message": "userId é obrigatório"})

        key_condition = Key("PK").eq(f"USER#{user_id}")

        result = table.query(
            KeyConditionExpression=key_condition,
            FilterExpression=Attr("type").eq("CARE")
        )

        items = result.get("Items", [])

        # filtra por pet, se informado
        if pet_id:
            items = [
                item for item in items
                if item["SK"].startswith(f"PET#{pet_id}#")
            ]

        # ordena por data do cuidado (desc)
        items.sort(
            key=lambda x: x.get("performedAt", ""),
            reverse=True
        )

        return response(200, items)

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
