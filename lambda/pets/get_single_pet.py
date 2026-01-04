import json
import os
import boto3

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["PETS_TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)


def normalize_pet(item: dict) -> dict:
    return {
        "id": item.get("petId"),
        "name": item.get("name"),
        "species": item.get("species", "").lower(),
        "breed": item.get("breed"),
        "sex": item.get("gender", "").lower(),   # atenção aqui
        "birthDate": item.get("birthDate"),
        "photo": item.get("photoUrl"),
        "notes": item.get("notes"),
        "createdAt": item.get("createdAt"),
    }


def lambda_handler(event, context):
    try:
        path = event.get("pathParameters") or {}
        query = event.get("queryStringParameters") or {}

        pet_id = path.get("petId")
        user_id = query.get("userId")

        if not pet_id or not user_id:
            return response(400, {
                "message": "petId (path) and userId (query) are required"
            })

        result = table.get_item(
            Key={
                "PK": f"USER#{user_id}",
                "SK": f"PET#{pet_id}",
            }
        )

        item = result.get("Item")

        if not item:
            return response(404, {"message": "Pet not found"})

        pet = normalize_pet(item)

        return response(200, pet)

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
