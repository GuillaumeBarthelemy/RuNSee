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
import traceback
from datetime import datetime, timezone
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

    if not email or not password:
        return build_error(
            "GARMINCONNECT_CREDENTIALS_REQUIRED",
            "Email et mot de passe Garmin requis.",
        )

    with tempfile.TemporaryDirectory(prefix="runsee-garmin-") as tokenstore:
        tokenstore_path = Path(tokenstore)

        try:
            api = Garmin(email=email, password=password)

            class MfaRequired(Exception):
                pass

            def prompt_mfa():
                if not mfa_code:
                    raise MfaRequired()
                return mfa_code

            try:
                api.garth.login(email, password, prompt_mfa=prompt_mfa)
            except MfaRequired:
                return {
                    "status": "mfa_required",
                    "code": "GARMINCONNECT_MFA_REQUIRED",
                    "message": "Garmin demande un code de validation.",
                }

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
                    "createdAt": datetime.now(timezone.utc).isoformat(),
                    "files": token_files,
                },
                "profile": extract_profile(api),
            }
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
        except GarminConnectTooManyRequestsError as exc:
            return build_error("GARMINCONNECT_RATE_LIMITED", exc, retryable=True)
        except GarminConnectAuthenticationError as exc:
            return build_error("GARMINCONNECT_AUTHENTICATION_FAILED", exc)
        except GarminConnectConnectionError as exc:
            return build_error("GARMINCONNECT_CONNECTION_FAILED", exc, retryable=True)
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
