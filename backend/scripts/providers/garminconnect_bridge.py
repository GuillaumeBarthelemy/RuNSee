#!/usr/bin/env python3
"""Small JSON bridge around the non-official garminconnect package.

The Node backend sends one JSON request on stdin and expects one JSON response on
stdout. Keep this script quiet: never log credentials, cookies or raw Garmin
payloads here.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import time
import traceback
from datetime import datetime, timedelta, timezone
from pathlib import Path


def write_response(payload: dict) -> None:
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))
    sys.stdout.flush()


def read_request() -> dict:
    try:
        return json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        return {}


def sanitize_message(value: object) -> str:
    message = str(value or "").strip()
    if not message:
        return "Garmin Connect a refuse la requete."
    return message[:500]


def build_error(code: str, message: object, *, retryable: bool = False) -> dict:
    return {
        "status": "error",
        "code": code,
        "message": sanitize_message(message),
        "retryable": retryable,
    }


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_http_status_from_exception(exc: Exception) -> int | None:
    nested_error = getattr(exc, "error", None)
    response = getattr(nested_error, "response", None)
    status_code = getattr(response, "status_code", None)

    if isinstance(status_code, int):
        return status_code

    message = str(exc)
    if "429" in message or "Too Many Requests" in message:
        return 429
    if "401" in message:
        return 401
    if "403" in message:
        return 403

    return None


def build_garth_error(exc: Exception) -> dict:
    status_code = get_http_status_from_exception(exc)

    if status_code == 429:
        return build_error(
            "GARMINCONNECT_RATE_LIMITED",
            "Garmin limite temporairement les tentatives de connexion. Attends 30 a 60 minutes avant de reessayer.",
            retryable=True,
        )

    if status_code in (401, 403):
        return build_error(
            "GARMINCONNECT_AUTHENTICATION_FAILED",
            "Garmin a refuse la connexion. Verifie tes identifiants ou reessaie plus tard.",
        )

    if status_code and status_code >= 500:
        return build_error(
            "GARMINCONNECT_UNAVAILABLE",
            "Garmin est temporairement indisponible. Reessaie plus tard.",
            retryable=True,
        )

    return build_error(
        "GARMINCONNECT_UNEXPECTED_ERROR",
        "La connexion Garmin a echoue avant la creation de session. Reessaie plus tard.",
        retryable=True,
    )


def is_rate_limit_exception(exc: Exception) -> bool:
    return get_http_status_from_exception(exc) == 429


def list_tokenstore_files(tokenstore_dir: Path) -> list[dict]:
    files = []

    for path in sorted(tokenstore_dir.rglob("*")):
        if not path.is_file():
            continue

        relative_path = path.relative_to(tokenstore_dir).as_posix()
        files.append(
            {
                "path": relative_path,
                "content": path.read_text(encoding="utf-8"),
            }
        )

    return files


def build_mfa_challenge(client_state: dict) -> dict:
    try:
        from requests.utils import dict_from_cookiejar  # pylint: disable=import-outside-toplevel
    except Exception:
        dict_from_cookiejar = None

    client = client_state.get("client")
    cookies = {}

    if dict_from_cookiejar and client is not None:
        cookies = dict_from_cookiejar(client.sess.cookies)

    created_at = utc_now()

    return {
        "schema": "garminconnect-mfa-challenge-v1",
        "createdAt": created_at.isoformat(),
        "expiresAt": (created_at + timedelta(minutes=10)).isoformat(),
        "domain": getattr(client, "domain", "garmin.com") if client is not None else "garmin.com",
        "cookies": cookies,
        "loginParams": client_state.get("login_params") or {},
        "mfaMethod": client_state.get("mfa_method") or "email",
    }


def restore_mfa_challenge(api, challenge: dict) -> dict:
    try:
        from requests.utils import cookiejar_from_dict  # pylint: disable=import-outside-toplevel
    except Exception as exc:
        raise ValueError("MFA challenge cookies cannot be restored.") from exc

    if not isinstance(challenge, dict):
        raise ValueError("MFA challenge is missing.")

    if challenge.get("schema") != "garminconnect-mfa-challenge-v1":
        raise ValueError("MFA challenge schema is unsupported.")

    expires_at = str(challenge.get("expiresAt") or "")

    if expires_at:
        parsed_expires_at = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))

        if parsed_expires_at < utc_now():
            raise ValueError("MFA challenge expired.")

    domain = str(challenge.get("domain") or "garmin.com")

    if hasattr(api.garth, "configure"):
        api.garth.configure(domain=domain)
    else:
        api.garth.domain = domain

    api.garth.sess.cookies.update(cookiejar_from_dict(challenge.get("cookies") or {}))

    return {
        "client": api.garth,
        "login_params": challenge.get("loginParams") or {},
        "mfa_method": challenge.get("mfaMethod") or "email",
    }


def extract_profile(api) -> dict:
    profile = {}

    try:
        full_name = getattr(api, "display_name", "") or ""
        if full_name:
            profile["displayName"] = str(full_name)
    except Exception:
        pass

    try:
        user_profile = api.get_user_profile()
        if isinstance(user_profile, dict):
            for source, target in (
                ("displayName", "displayName"),
                ("fullName", "displayName"),
                ("userName", "accountIdentifier"),
                ("profileId", "accountIdentifier"),
            ):
                value = user_profile.get(source)
                if value and not profile.get(target):
                    profile[target] = str(value)
    except Exception:
        pass

    return profile


def export_connected_session(api, tokenstore_path: Path) -> dict:
    if hasattr(api.garth, "dump"):
        api.garth.dump(str(tokenstore_path))
    else:
        return build_error(
            "GARMINCONNECT_SESSION_EXPORT_UNAVAILABLE",
            "La session Garmin ne peut pas etre exportee avec cette version du connecteur.",
        )

    try:
        api.display_name = api.garth.profile["displayName"]
        api.full_name = api.garth.profile["fullName"]
    except Exception:
        pass

    token_files = list_tokenstore_files(tokenstore_path)

    if not token_files:
        return build_error(
            "GARMINCONNECT_EMPTY_SESSION",
            "Garmin a accepte la connexion mais aucun token exploitable n'a ete produit.",
        )

    return {
        "status": "connected",
        "session": {
            "schema": "garminconnect-tokenstore-v1",
            "createdAt": utc_now().isoformat(),
            "files": token_files,
        },
        "profile": extract_profile(api),
    }


def login_with_tokens(request: dict) -> dict:
    try:
        from garminconnect import (  # pylint: disable=import-outside-toplevel
            Garmin,
            GarminConnectAuthenticationError,
            GarminConnectConnectionError,
            GarminConnectTooManyRequestsError,
        )
        from garth.exc import GarthException, GarthHTTPError  # pylint: disable=import-outside-toplevel
    except Exception as exc:  # pragma: no cover - depends on runtime image
        return build_error(
            "GARMINCONNECT_DEPENDENCY_MISSING",
            f"La librairie garminconnect n'est pas disponible: {exc}",
        )

    email = str(request.get("email") or "").strip()
    password = str(request.get("password") or "")
    mfa_code = str(request.get("mfaCode") or "").strip()
    mfa_challenge = request.get("mfaChallenge")

    if not email or not password:
        return build_error(
            "GARMINCONNECT_CREDENTIALS_REQUIRED",
            "Email et mot de passe Garmin requis.",
        )

    with tempfile.TemporaryDirectory(prefix="runsee-garmin-") as tokenstore:
        tokenstore_path = Path(tokenstore)

        try:
            api = Garmin(email=email, password=password)
            auth_retry_delays_seconds = (8, 15)

            class MfaRequired(Exception):
                pass

            def prompt_mfa():
                if not mfa_code:
                    raise MfaRequired()
                return mfa_code

            def login_with_transient_rate_limit_retries():
                for attempt_index in range(len(auth_retry_delays_seconds) + 1):
                    if attempt_index > 0:
                        time.sleep(auth_retry_delays_seconds[attempt_index - 1])

                    try:
                        if mfa_code:
                            return api.garth.login(email, password, prompt_mfa=prompt_mfa)

                        return api.garth.login(
                            email,
                            password,
                            prompt_mfa=None,
                            return_on_mfa=True,
                        )
                    except GarminConnectTooManyRequestsError:
                        if attempt_index >= len(auth_retry_delays_seconds):
                            raise
                    except GarthHTTPError as exc:
                        if (
                            not is_rate_limit_exception(exc)
                            or attempt_index >= len(auth_retry_delays_seconds)
                        ):
                            raise

                return None

            if mfa_code and isinstance(mfa_challenge, dict):
                try:
                    client_state = restore_mfa_challenge(api, mfa_challenge)
                    api.garth.resume_login(client_state, mfa_code)
                except ValueError:
                    return build_error(
                        "GARMINCONNECT_MFA_CHALLENGE_EXPIRED",
                        "La validation Garmin a expire. Relance une connexion Garmin complete.",
                    )

                return export_connected_session(api, tokenstore_path)

            try:
                login_result = login_with_transient_rate_limit_retries()
            except MfaRequired:
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_REQUIRED",
                    "message": "Garmin demande un code de validation.",
                }

            if (
                isinstance(login_result, tuple)
                and len(login_result) == 2
                and login_result[0] == "needs_mfa"
            ):
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_REQUIRED",
                    "message": "Garmin demande un code de validation.",
                    "challenge": build_mfa_challenge(login_result[1]),
                }

            return export_connected_session(api, tokenstore_path)
        except AssertionError:
            if not mfa_code:
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_OR_AUTH_REQUIRED",
                    "message": "Garmin demande peut-etre un code de validation.",
                }

            return build_error(
                "GARMINCONNECT_AUTHENTICATION_FAILED",
                "Garmin a refuse la connexion ou le code de validation.",
            )
        except GarminConnectTooManyRequestsError:
            return build_error(
                "GARMINCONNECT_RATE_LIMITED",
                "Garmin limite temporairement les tentatives de connexion. Attends 30 a 60 minutes avant de reessayer.",
                retryable=True,
            )
        except GarminConnectAuthenticationError:
            return build_error(
                "GARMINCONNECT_AUTHENTICATION_FAILED",
                "Garmin a refuse la connexion. Verifie tes identifiants ou le code de validation.",
            )
        except GarminConnectConnectionError:
            return build_error(
                "GARMINCONNECT_CONNECTION_FAILED",
                "Garmin est temporairement indisponible ou ne repond pas correctement. Reessaie plus tard.",
                retryable=True,
            )
        except GarthHTTPError as exc:
            return build_garth_error(exc)
        except GarthException as exc:
            if "MFA" in str(exc) and not mfa_code:
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_REQUIRED",
                    "message": "Garmin demande un code de validation.",
                }

            return build_garth_error(exc)
        except Exception as exc:
            if "MFA" in str(exc) and not mfa_code:
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_REQUIRED",
                    "message": "Garmin demande un code de validation.",
                }

            if os.environ.get("RUNSEE_GARMIN_BRIDGE_DEBUG") == "1":
                return build_error("GARMINCONNECT_UNEXPECTED_ERROR", traceback.format_exc())

            return build_error(
                "GARMINCONNECT_UNEXPECTED_ERROR",
                "La connexion Garmin a echoue avant la creation de session. Reessaie plus tard.",
                retryable=True,
            )


def main() -> None:
    request = read_request()
    operation = str(request.get("operation") or "").strip().lower()

    if operation == "login":
        write_response(login_with_tokens(request))
        return

    write_response(build_error("GARMINCONNECT_UNSUPPORTED_OPERATION", "Operation non supportee."))


if __name__ == "__main__":
    main()
