import json
import os
import boto3
from datetime import datetime, timedelta
from uuid import uuid4

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ["HEALTH_RECORDS_TABLE"]
table = dynamodb.Table(TABLE_NAME)


def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")

        user_id = body.get("userId")
        pet_id = body.get("petId")
        care_type = body.get("type")
        performed_at = body.get("performedAt")
        periodicity = body.get("periodicity", "30")
        notes = body.get("notes")

        if not user_id or not pet_id or not care_type or not performed_at:
            return response(400, {
                "message": "userId, petId, type e performedAt são obrigatórios"
            })

        now_iso = datetime.utcnow().isoformat()

        # calcula próxima data
        next_due_date = (
            datetime.fromisoformat(performed_at) +
            timedelta(days=int(periodicity))
        ).date().isoformat()

        item = {
            "PK": f"USER#{user_id}",
            "SK": f"PET#{pet_id}#CARE#{now_iso}",
            "type": "CARE",
            "recordId": str(uuid4()),
            "careType": care_type,
            "performedAt": performed_at,
            "periodicity": periodicity,
            "nextDueDate": next_due_date,
            "createdAt": now_iso,
        }

        if notes:
            item["notes"] = notes

        table.put_item(Item=item)

        return response(201, {
            "message": "Cuidado registrado com sucesso",
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
