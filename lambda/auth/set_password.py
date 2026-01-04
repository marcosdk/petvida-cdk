import json
import os
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

cognito = boto3.client("cognito-idp")

USER_POOL_ID = os.environ["USER_POOL_ID"]

def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))

        email = body.get("email")
        password = body.get("password")
        

        if not email or not password:
            return response(400, "Dados obrigatórios ausentes")

        
        logger.info(f"🔐 Definindo senha para {email}")

        cognito.admin_set_user_password(
            UserPoolId=USER_POOL_ID,
            Username=email,
            Password=password,
            Permanent=True,
        )

        logger.info("✅ Senha definida com sucesso")

        return response(200, "Senha definida com sucesso")

    except cognito.exceptions.UserNotFoundException:
        return response(404, "Usuário não encontrado")

    except Exception as e:
        logger.exception("🔥 Erro ao definir senha")
        return response(500, "Erro interno")


def response(status, message):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps({ "message": message }),
    }
