import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Literal

from app.core.config import Settings

logger = logging.getLogger(__name__)


def send_thermal_notification_email(
    *,
    recipients: list[str],
    notification_type: Literal["alert", "alarm"],
    equipment_code: str,
    equipment_name: str,
    maximum_temperature: float,
    trigger_limit: float,
    normal_image_path: Path,
    thermal_image_path: Path,
    settings: Settings,
) -> bool:
    if not recipients:
        logger.warning("thermography.%s_email.skipped reason=no_opted_in_recipients", notification_type)
        return False
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password.get_secret_value():
        logger.error("Thermal notification email is not configured.")
        return False

    sender = settings.emails_from_email or settings.smtp_user
    is_alarm = notification_type == "alarm"
    notification_label = "Alarme" if is_alarm else "Alerta"
    limit_label = "Limite de alarme" if is_alarm else "Limite de alerta"
    message = EmailMessage()
    message["Subject"] = f"{notification_label} de temperatura — {equipment_code}"
    message["From"] = formataddr((settings.emails_from_name, sender))
    message["To"] = "undisclosed-recipients:;"
    message.set_content(
        f"Um {notification_label.lower()} térmico foi identificado durante a análise termográfica.\n\n"
        f"Equipamento: {equipment_name} ({equipment_code})\n"
        f"Temperatura máxima medida: {maximum_temperature:.2f} °C\n"
        f"{limit_label} cadastrado: {trigger_limit:.2f} °C\n\n"
        f"A temperatura máxima atingiu ou ultrapassou o {limit_label.lower()}. "
        "A ordem de serviço não foi criada automaticamente. Avalie as imagens "
        "anexadas e abra uma OS se necessário.\n\n"
        "As imagens normal e termográfica seguem anexadas a este e-mail."
    )

    for image_path, subtype in ((normal_image_path, "jpeg"), (thermal_image_path, "png")):
        try:
            image_data = image_path.read_bytes()
        except OSError:
            logger.exception("Thermal alarm image attachment could not be read: %s", image_path)
            return False
        message.add_attachment(
            image_data,
            maintype="image",
            subtype=subtype,
            filename=image_path.name,
        )

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp_client:
            smtp_client.starttls(context=ssl.create_default_context())
            smtp_client.login(settings.smtp_user, settings.smtp_password.get_secret_value())
            smtp_client.send_message(message, to_addrs=recipients)
        logger.info(
            "thermography.%s_email.sent equipment_code=%s recipient_count=%s",
            notification_type,
            equipment_code,
            len(recipients),
        )
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("thermography.%s_email.failed equipment_code=%s", notification_type, equipment_code)
        return False
