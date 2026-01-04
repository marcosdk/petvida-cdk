import json
import os
import boto3
import logging
import traceback

# =========================
# Logger configuration
# =========================
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# =========================
# AWS clients
# =========================
s3 = boto3.client("s3")

# =========================
# Environment variables
# =========================
BUCKET = os.environ["BUCKET_NAME"]
CLOUDFRONT_URL = os.environ["CLOUDFRONT_URL"]

# =========================
# Constants
# =========================
ALLOWED_TYPES = ["image/jpeg", "image/png"]
MAX_SIZE_MB = 5


def lambda_handler(event, context):
    request_id = context.aws_request_id

    logger.info({
        "message": "Lambda execution started",
        "requestId": request_id
    })

    try:
        logger.info({
            "message": "Incoming event received",
            "requestId": request_id,
            "eventKeys": list(event.keys())
        })

        body_raw = event.get("body", "{}")
        logger.info({
            "message": "Raw body received",
            "requestId": request_id,
            "body": body_raw
        })

        body = json.loads(body_raw)

        user_id = body.get("userId")
        pet_id = body.get("petId")
        content_type = body.get("contentType")

        logger.info({
            "message": "Parsed request body",
            "requestId": request_id,
            "userId": user_id,
            "petId": pet_id,
            "contentType": content_type
        })

        # =========================
        # Validations
        # =========================
        if not user_id or not pet_id or not content_type:
            logger.warning({
                "message": "Missing required fields",
                "requestId": request_id
            })
            return response(400, "Campos obrigatórios ausentes")

        if content_type not in ALLOWED_TYPES:
            logger.warning({
                "message": "Invalid content type",
                "requestId": request_id,
                "contentType": content_type
            })
            return response(400, "Tipo de arquivo não permitido")

        # =========================
        # Build S3 key
        # =========================
        key = f"users/{user_id}/pets/{pet_id}.jpg"

        logger.info({
            "message": "Generating presigned URL",
            "requestId": request_id,
            "bucket": BUCKET,
            "key": key,
            "expiresInSeconds": 300
        })

        # =========================
        # Generate presigned URL
        # =========================
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": BUCKET,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=300
        )

        photo_url = f"{CLOUDFRONT_URL}/{key}"

        logger.info({
            "message": "Presigned URL generated successfully",
            "requestId": request_id,
            "photoUrl": photo_url
        })

        logger.info({
            "message": "Lambda execution finished successfully",
            "requestId": request_id
        })

        return response(200, {
            "uploadUrl": upload_url,
            "photoUrl": photo_url
        })

    except Exception as e:
        logger.error({
            "message": "Unhandled exception",
            "requestId": request_id,
            "error": str(e),
            "stackTrace": traceback.format_exc()
        })

        return response(500, "Erro interno ao gerar URL de upload")


def response(status, body):
    logger.info({
        "message": "Sending response",
        "statusCode": status
    })

    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(body),
    }
