import json
import os
import boto3
from datetime import datetime
from uuid import uuid4

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["HEALTH_RECORDS_TABLE"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")

        user_id = body.get("userId")
        pet_id = body.get("petId")
        name = body.get("name")
        applied_at = body.get("appliedAt")
        next_dose = body.get("nextDose")

        # 🔒 Validações básicas
        if not user_id or not pet_id or not name or not applied_at:
            return response(400, {
                "message": "petId, name e appliedAt são obrigatórios"
            })

        now_iso = datetime.utcnow().isoformat()

        item = {
            "PK": f"USER#{user_id}",
            "SK": f"PET#{pet_id}#VACCINE#{now_iso}",            
            "type": "VACCINE",
            "recordId": str(uuid4()),
            "name": name,
            "appliedAt": applied_at,
            "createdAt": now_iso,
        }

        if next_dose:
            item["nextDueDate"] = next_dose

        table.put_item(Item=item)

        return response(201, {
            "message": "Vacina registrada com sucesso",
            "record": item
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
