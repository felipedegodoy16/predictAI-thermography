import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from app.core.config import Settings

logger = logging.getLogger(__name__)


def send_password_reset_email(
    email: str, token: str, settings: Settings
) -> None:
    if not settings.smtp_host or not settings.smtp_user or not settings.smtp_password.get_secret_value():
        logger.error("Password reset email is not configured.")
        return

    reset_url = _build_reset_url(settings.frontend_url, token)
    sender = settings.emails_from_email or settings.smtp_user
    message = EmailMessage()
    message["Subject"] = "Redefinição de senha"
    message["From"] = formataddr((settings.emails_from_name, sender))
    message["To"] = email
    message.set_content(
        "Olá,\n\n"
        "Recebemos uma solicitação para redefinir a senha da sua conta. "
        "Acesse o link abaixo em até 5 minutos:\n\n"
        f"{reset_url}\n\n"
        "Se você não solicitou essa alteração, ignore este e-mail."
    )

    try:
        with smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=20,
        ) as smtp_client:
            smtp_client.starttls(context=ssl.create_default_context())
            smtp_client.login(
                settings.smtp_user,
                settings.smtp_password.get_secret_value(),
            )
            smtp_client.send_message(message)
    except (OSError, smtplib.SMTPException):
        logger.exception("Failed to send password reset email.")


def _build_reset_url(frontend_url: str, token: str) -> str:
    parts = urlsplit(frontend_url)
    query = parse_qsl(parts.query, keep_blank_values=True)
    query.append(("token", token))
    return urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )
