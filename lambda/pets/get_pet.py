import json
import os
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["PETS_TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)




def normalize_pet(item: dict) -> dict:
    return {
        "id": item.get("petId") or item.get("id"),
        "name": item.get("name"),
        "species": item.get("species", "").lower(),  # DOG -> dog
        "breed": item.get("breed"),
        "sex": item.get("sex", "").lower(),          # MALE -> male
        "birthDate": item.get("birthDate"),
        "photo": item.get("photoUrl"),
        "notes": item.get("notes"),
        "createdAt": item.get("createdAt"),
    }


def lambda_handler(event, context):
    try:
        params = event.get("queryStringParameters") or {}
        user_id = params.get("userId")

        if not user_id:
            return response(400, {"message": "userId is required"})

        result = table.query(
            KeyConditionExpression=
                Key("PK").eq(f"USER#{user_id}") &
                Key("SK").begins_with("PET#"),
            ScanIndexForward=False
        )

        items = result.get("Items", [])

        pets = [normalize_pet(item) for item in items]

        return response(200, pets)

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
