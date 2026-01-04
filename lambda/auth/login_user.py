import json
import os
import logging

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito = boto3.client("cognito-idp")

USER_POOL_ID = os.environ["USER_POOL_ID"]
CLIENT_ID = os.environ["CLIENT_ID"]


def handler(event, context):
    logger.info("🚀 Login Lambda invoked")
    logger.info(f"Event: {json.dumps(event)}")

    try:
        body = json.loads(event.get("body", "{}"))
        email = body.get("email")
        password = body.get("password")

        if not email or not password:
            return response(400, {"message": "E-mail e senha obrigatórios"})

        logger.info(f"🔐 Authenticating user: {email}")

        auth_response = cognito.admin_initiate_auth(
            UserPoolId=USER_POOL_ID,
            ClientId=CLIENT_ID,
            AuthFlow="ADMIN_USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": email,
                "PASSWORD": password,
            },
        )

        tokens = auth_response["AuthenticationResult"]

        logger.info("✅ Login successful")

        return response(
            200,
            {
                "idToken": tokens["IdToken"],
                "accessToken": tokens["AccessToken"],
                "refreshToken": tokens["RefreshToken"],
                "expiresIn": tokens["ExpiresIn"],
                "tokenType": tokens["TokenType"],
            },
        )

    except cognito.exceptions.NotAuthorizedException:
        logger.warning("❌ Invalid credentials")
        return response(401, {"message": "Usuário ou senha inválidos"})

    except ClientError as e:
        logger.error("🔥 AWS ClientError", exc_info=True)
        return response(
            500,
            {"message": "Erro ao autenticar", "error": e.response["Error"]["Message"]},
        )

    except Exception as e:
        logger.error("🔥 Unexpected error", exc_info=True)
        return response(500, {"message": "Erro inesperado", "error": str(e)})


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # DEV
        },
        "body": json.dumps(body),
    }
