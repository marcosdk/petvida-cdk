import os
import json
import time
import base64
import logging
from datetime import datetime, timezone

import boto3
import stripe
from botocore.exceptions import ClientError

# =========================
# LOGGING
# =========================
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# =========================
# ENV VARS
# =========================
STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_WEBHOOK_SECRET = os.environ["STRIPE_WEBHOOK_SECRET"]
EVENTS_TABLE = os.environ["STRIPE_EVENTS_TABLE"]
USER_TABLE = os.environ["USERS_TABLE"]
USER_POOL_ID = os.environ["USER_POOL_ID"]

stripe.api_key = STRIPE_SECRET_KEY

# =========================
# AWS CLIENTS
# =========================
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(EVENTS_TABLE)
userTable = dynamodb.Table(USER_TABLE)

cognito = boto3.client("cognito-idp")

# =========================
# COGNITO - CREATE USER
# =========================
def create_cognito_user(email: str, name: str) -> str:
    try:
        logger.info(f"👤 Creating Cognito user | email={email}")

        response = cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,  # email como username
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "name", "Value": name},
            ],
            MessageAction="SUPPRESS",
        )

        user_sub = response["User"]["Username"]
        logger.info(f"✅ Cognito user created | user_id={user_sub}")

        return user_sub

    except cognito.exceptions.UsernameExistsException:
        logger.warning(f"⚠️ Usuário já existe no Cognito | email={email}")
        return email  # idempotência

    except ClientError:
        logger.exception("❌ Erro ao criar usuário no Cognito")
        raise

# =========================
# DYNAMODB - CREATE USER
# =========================
def save_user_dynamodb(user_id: str, name: str, email: str):
    logger.info("💾 Saving user in DynamoDB")

    userTable.put_item(
        Item={
            "PK": f"USER#{user_id}",
            "SK": "PROFILE",

            "id": user_id,
            "name": name,
            "email": email,

            "created_at": datetime.now(timezone.utc).isoformat(),
            "entity": "USER",
        },
        ConditionExpression="attribute_not_exists(PK)",
    )

# =========================
# HANDLER
# =========================
def handler(event, context):
    logger.info("🔔 Stripe webhook recebido")

    # =========================
    # BODY (base64-safe)
    # =========================
    payload = event.get("body", "")
    if event.get("isBase64Encoded"):
        payload = base64.b64decode(payload).decode("utf-8")

    # =========================
    # HEADERS
    # =========================
    headers = {k.lower(): v for k, v in (event.get("headers") or {}).items()}
    sig_header = headers.get("stripe-signature")

    if not sig_header:
        logger.error("❌ Header Stripe-Signature ausente")
        return {"statusCode": 400, "body": "Missing signature"}

    # =========================
    # VALIDAR EVENTO STRIPE
    # =========================
    try:
        stripe_event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        logger.exception("❌ Payload inválido")
        return {"statusCode": 400, "body": "Invalid payload"}
    except stripe.SignatureVerificationError:
        logger.exception("❌ Assinatura inválida")
        return {"statusCode": 400, "body": "Invalid signature"}

    # =========================
    # EXTRAÇÃO DE DADOS
    # =========================
    event_id = stripe_event["id"]
    event_type = stripe_event["type"]
    livemode = stripe_event["livemode"]

    created_epoch = stripe_event["created"]
    created_at = datetime.fromtimestamp(
        created_epoch, tz=timezone.utc
    ).isoformat()

    received_epoch = int(time.time())
    received_at = datetime.now(timezone.utc).isoformat()

    logger.info(
        "📦 Evento Stripe validado",
        extra={"event_id": event_id, "type": event_type},
    )

    # =========================
    # SALVAR EVENTO (IDEMPOTENTE)
    # =========================
    try:
        table.put_item(
            Item={
                "PK": f"EVENT#{event_id}",
                "SK": f"CREATED#{created_at}",

                "event_id": event_id,
                "type": event_type,
                "livemode": livemode,

                "created_epoch": created_epoch,
                "created_at": created_at,
                "received_epoch": received_epoch,
                "received_at": received_at,

                "payload": stripe_event,
            },
            ConditionExpression="attribute_not_exists(PK)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            logger.warning(f"🔁 Evento duplicado ignorado: {event_id}")
            return {"statusCode": 200, "body": "duplicate"}
        raise

    # =========================
    # EVENTO: CHECKOUT COMPLETED
    # =========================
    if event_type == "checkout.session.completed":
        logger.info("🧾 Checkout session completed")

        session = stripe_event["data"]["object"]
        metadata = session.get("metadata", {})

        email = metadata.get("email")
        name = metadata.get("name")

        if not email or not name:
            logger.error("❌ Metadata incompleta (email/nome)")
            return {"statusCode": 400, "body": "Missing user metadata"}

        # 1️⃣ Cognito
        user_id = create_cognito_user(email=email, name=name)

        # 2️⃣ DynamoDB
        try:
            save_user_dynamodb(
                user_id=user_id,
                name=name,
                email=email,
            )
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                logger.warning("⚠️ Usuário já existe no DynamoDB")
            else:
                raise

    # =========================
    # OUTROS EVENTOS
    # =========================
    elif event_type == "invoice.paid":
        logger.info("💰 Invoice paga")

    elif event_type == "invoice.payment_failed":
        logger.warning("⚠️ Falha no pagamento")

    elif event_type == "customer.subscription.deleted":
        logger.info("🛑 Subscription cancelada")

    else:
        logger.info(f"ℹ️ Evento não tratado: {event_type}")

    return {
        "statusCode": 200,
        "body": json.dumps({"status": "ok"}),
    }
