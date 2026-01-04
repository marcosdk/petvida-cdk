import json
import os
import uuid
from datetime import datetime, timezone

import boto3

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["PETS_TABLE_NAME"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        user_id = body.get("userId")
        name = body.get("name")
        species = body.get("species")

        if not user_id or not name or not species:
            return response(400, {"message": "userId, name and species are required"})

        pet_id = body.get("petId") or str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        item = {
            "PK": f"USER#{user_id}",
            "SK": f"PET#{pet_id}",
            "petId": pet_id,
            "name": name,
            "species": species,
            "breed": body.get("breed", ""),
            "gender": body.get("gender", ""),
            "birthDate": body.get("birthDate", ""),
            "photoUrl": body.get("photoUrl", ""),
            "notes": body.get("notes", ""),
            "createdAt": now,
        }

        table.put_item(Item=item)

        return response(201, item)

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
