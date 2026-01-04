import json
import os
import stripe
import logging
from datetime import datetime


# Logger
logger = logging.getLogger()
logger.setLevel(logging.INFO)



#Stripe   
STRIPE_SECRET_KEY = os.environ["STRIPE_SECRET_KEY"]
STRIPE_PRICE_ID = os.environ["STRIPE_PRICE_ID"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

stripe.api_key = STRIPE_SECRET_KEY



def handler(event, context):
    logger.info("🚀 Lambda invoked")
    logger.info(f"Event received: {json.dumps(event)}")

    try:
        body = json.loads(event.get("body", "{}"))
        name = body.get("name")
        email = body.get("email")
        
        logger.info(f"📥 Payload parsed | name={name} | email={email}")

        if not name or not email:
            logger.warning("❌ Missing required fields")
            return response(400, {"message": "Dados inválidos"})

        # =========================
        # 1️⃣ Criar Customer no Stripe
        # =========================
        logger.info("💳 Creating Stripe customer")

        customer = stripe.Customer.create(
            email=email,
            name=name,
            
        )

        # =========================
        # 2️⃣ Criar Checkout Session (Subscription + Trial)
        # =========================
        logger.info("🧾 Creating Stripe Checkout Session")

        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=customer.id,
            line_items=[
                {
                    "price": STRIPE_PRICE_ID,
                    "quantity": 1,
                }
            ],
            subscription_data={
                "trial_period_days": 1,
            },
            success_url=f"{FRONTEND_URL}/pass?email={email}&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/cadastro",
            metadata={
                "email": email,
                "name": name
            },
        )
    
        return response(201, {
            "message": "Usuário criado",
            "checkoutUrl": session.url
        }
)


    except Exception as e:
        logger.error("🔥 Unexpected error", exc_info=True)
        return response(
            500,
            {"message": "Erro inesperado", "error": str(e)},
        )


def response(status_code, body):
    logger.info(f"📤 Responding with status {status_code}")
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # DEV
        },
        "body": json.dumps(body),
    }
