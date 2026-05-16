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


def restore_tokenstore_files(session: dict, tokenstore_path: Path) -> None:
    if not isinstance(session, dict):
        raise ValueError("Garmin session is missing.")

    if session.get("schema") != "garminconnect-tokenstore-v1":
        raise ValueError("Garmin session schema is unsupported.")

    files = session.get("files")

    if not isinstance(files, list) or not files:
        raise ValueError("Garmin session files are missing.")

    for item in files:
        if not isinstance(item, dict):
            continue

        relative_path = str(item.get("path") or "").strip().replace("\\", "/")
        content = str(item.get("content") or "")

        if not relative_path or relative_path.startswith("/") or ".." in relative_path.split("/"):
            continue

        target_path = tokenstore_path / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_text(content, encoding="utf-8")


def normalize_date_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []

    dates: list[str] = []

    for item in value:
        candidate = str(item or "").strip()

        if len(candidate) != 10:
            continue

        try:
            datetime.strptime(candidate, "%Y-%m-%d")
        except ValueError:
            continue

        dates.append(candidate)

    return dates[:7]


def build_source_error(source: str, exc: Exception) -> dict:
    return {
        "source": source,
        "code": f"GARMINCONNECT_{source.upper()}_ERROR",
        "message": sanitize_message(exc),
    }


def fetch_recovery_days(request: dict) -> dict:
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

    dates = normalize_date_list(request.get("dates"))

    if not dates:
        return build_error(
            "GARMINCONNECT_DATES_REQUIRED",
            "Aucune date Garmin valide n'a ete demandee.",
        )

    with tempfile.TemporaryDirectory(prefix="runsee-garmin-session-") as tokenstore:
        tokenstore_path = Path(tokenstore)

        try:
            restore_tokenstore_files(request.get("session"), tokenstore_path)
            api = Garmin()
            api.login(tokenstore=str(tokenstore_path))
        except (ValueError, GarminConnectAuthenticationError):
            return build_error(
                "GARMINCONNECT_SESSION_EXPIRED",
                "La session Garmin n'est plus valide. Reconnecte Garmin.",
            )
        except (GarminConnectConnectionError, GarthHTTPError, GarthException) as exc:
            if is_rate_limit_exception(exc):
                return build_error(
                    "GARMINCONNECT_RATE_LIMITED",
                    "Garmin limite temporairement la recuperation. RunNSee reprendra plus tard.",
                    retryable=True,
                )

            return build_garth_error(exc)
        except Exception as exc:
            if os.environ.get("RUNSEE_GARMIN_BRIDGE_DEBUG") == "1":
                return build_error("GARMINCONNECT_SESSION_RESTORE_FAILED", traceback.format_exc())

            return build_error(
                "GARMINCONNECT_SESSION_RESTORE_FAILED",
                "La session Garmin stockee ne peut pas etre rechargee.",
                retryable=True,
            )

        fetchers = (
            ("userSummary", api.get_user_summary),
            ("heartRates", api.get_heart_rates),
            ("sleep", api.get_sleep_data),
            ("hrv", api.get_hrv_data),
            ("stress", api.get_stress_data),
            ("bodyBattery", lambda cdate: api.get_body_battery(cdate, cdate)),
        )
        days = []

        for cdate in dates:
            day_payload = {
                "date": cdate,
                "raw": {},
                "errors": [],
            }

            for source, fetcher in fetchers:
                try:
                    day_payload["raw"][source] = fetcher(cdate)
                except GarminConnectTooManyRequestsError:
                    return {
                        "status": "rate_limited",
                        "code": "GARMINCONNECT_RATE_LIMITED",
                        "message": "Garmin limite temporairement la recuperation. RunNSee reprendra plus tard.",
                        "retryable": True,
                        "days": days,
                    }
                except (GarminConnectAuthenticationError, GarthHTTPError) as exc:
                    status_code = get_http_status_from_exception(exc)

                    if status_code == 429:
                        return {
                            "status": "rate_limited",
                            "code": "GARMINCONNECT_RATE_LIMITED",
                            "message": "Garmin limite temporairement la recuperation. RunNSee reprendra plus tard.",
                            "retryable": True,
                            "days": days,
                        }

                    if status_code in (401, 403) or isinstance(exc, GarminConnectAuthenticationError):
                        return {
                            "status": "expired",
                            "code": "GARMINCONNECT_SESSION_EXPIRED",
                            "message": "La session Garmin n'est plus valide. Reconnecte Garmin.",
                            "days": days,
                        }

                    day_payload["errors"].append(build_source_error(source, exc))
                except Exception as exc:
                    day_payload["errors"].append(build_source_error(source, exc))

                time.sleep(0.2)

            days.append(day_payload)

        return {
            "status": "success",
            "days": days,
        }


def fetch_activities(request: dict) -> dict:
    """Récupère les activités Garmin sur une plage de dates avec leurs
    métriques natives (Training Effect aérobie/anaérobie, VO2max séance,
    Performance Condition, Recovery Time).

    Phase K — Option B : enrichissement des activités Strava avec les données
    Garmin. Le matching avec les activités Strava se fait côté Node par
    timestamp (fenêtre ± 10 min).

    Request payload :
      - session : tokens Garmin sérialisés (comme fetch_recovery_days)
      - startDate : "YYYY-MM-DD" (inclus)
      - endDate : "YYYY-MM-DD" (inclus)

    Response :
      - status : "success" | "error" | "expired" | "rate_limited"
      - activities : liste de { activityId, startTimeLocal, activityName,
        activityType, distance, duration, aerobicTrainingEffect,
        anaerobicTrainingEffect, vO2MaxValue, performanceCondition,
        recoveryHeartRate, recoveryTime, ... }
    """
    try:
        from garminconnect import (  # pylint: disable=import-outside-toplevel
            Garmin,
            GarminConnectAuthenticationError,
            GarminConnectConnectionError,
            GarminConnectTooManyRequestsError,
        )
        from garth.exc import GarthException, GarthHTTPError  # pylint: disable=import-outside-toplevel
    except Exception as exc:  # pragma: no cover
        return build_error(
            "GARMINCONNECT_DEPENDENCY_MISSING",
            f"La librairie garminconnect n'est pas disponible: {exc}",
        )

    start_date = str(request.get("startDate") or "").strip()
    end_date = str(request.get("endDate") or "").strip()

    if not start_date or not end_date:
        return build_error(
            "GARMINCONNECT_DATES_REQUIRED",
            "startDate et endDate (YYYY-MM-DD) sont requis.",
        )

    with tempfile.TemporaryDirectory(prefix="runsee-garmin-act-") as tokenstore:
        tokenstore_path = Path(tokenstore)

        try:
            restore_tokenstore_files(request.get("session"), tokenstore_path)
            api = Garmin()
            api.login(tokenstore=str(tokenstore_path))
        except (ValueError, GarminConnectAuthenticationError):
            return build_error(
                "GARMINCONNECT_SESSION_EXPIRED",
                "La session Garmin n'est plus valide. Reconnecte Garmin.",
            )
        except (GarminConnectConnectionError, GarthHTTPError, GarthException) as exc:
            if is_rate_limit_exception(exc):
                return build_error(
                    "GARMINCONNECT_RATE_LIMITED",
                    "Garmin limite temporairement la recuperation. Reessaie plus tard.",
                    retryable=True,
                )
            return build_garth_error(exc)
        except Exception:
            return build_error(
                "GARMINCONNECT_SESSION_RESTORE_FAILED",
                "La session Garmin stockee ne peut pas etre rechargee.",
                retryable=True,
            )

        try:
            raw_activities = api.get_activities_by_date(start_date, end_date)
        except GarminConnectTooManyRequestsError:
            return {
                "status": "rate_limited",
                "code": "GARMINCONNECT_RATE_LIMITED",
                "message": "Garmin limite temporairement la recuperation.",
                "retryable": True,
                "activities": [],
            }
        except (GarminConnectAuthenticationError, GarthHTTPError) as exc:
            status_code = get_http_status_from_exception(exc)
            if status_code in (401, 403):
                return {
                    "status": "expired",
                    "code": "GARMINCONNECT_SESSION_EXPIRED",
                    "message": "Session Garmin expiree.",
                    "activities": [],
                }
            return build_garth_error(exc)
        except Exception as exc:  # pylint: disable=broad-except
            return build_error("GARMINCONNECT_ACTIVITIES_ERROR", sanitize_message(exc))

        # Filtrer les champs intéressants pour limiter le payload renvoyé.
        # On garde les clés natives Garmin pour traçabilité ; le mapping FR
        # canonique se fait côté frontend (activityEnrichment.types.js).
        kept_keys = (
            "activityId",
            "activityName",
            "activityType",
            "startTimeLocal",
            "startTimeGMT",
            "distance",
            "duration",
            "elapsedDuration",
            "movingDuration",
            "elevationGain",
            "averageHR",
            "maxHR",
            "averageRunCadence",
            "vO2MaxValue",
            "aerobicTrainingEffect",
            "aerobicTrainingEffectMessage",
            "anaerobicTrainingEffect",
            "anaerobicTrainingEffectMessage",
            "trainingEffectLabel",
            "performanceCondition",
            "recoveryHeartRate",
            "recoveryTime",
            "recoveryTimeInHours",
            "recoveryTimeMinutes",
            "recoveryTimeSeconds",
            "minActivityLapDuration",
            "averagePower",
            "maxPower",
            "trainingLoad",
            "trainingStressScore",
            "intensityFactor",
            "epoc",
            "anaerobicTrainingEffectScore",
            "aerobicTrainingEffectScore",
            "lactateThresholdBpm",
            "lactateThresholdSpeed",
        )

        # Champs additionnels fournis uniquement par l'endpoint DETAIL
        # (`api.get_activity(id)` → `summaryDTO`). L'endpoint LIST utilisé
        # ci-dessus n'expose pas EPOC, recoveryTime, lactateThreshold, etc.
        # → cf. diagnostic 2026-05 : 601 enrichments / 0 EPOC / 0 recoveryTime.
        detail_only_keys = (
            "epoc",
            "recoveryTime",
            "recoveryTimeInHours",
            "recoveryTimeMinutes",
            "recoveryTimeSeconds",
            "recoveryHeartRate",
            "performanceCondition",
            "trainingLoad",
            "trainingStressScore",
            "intensityFactor",
            "lactateThresholdBpm",
            "lactateThresholdSpeed",
            "averagePower",
            "maxPower",
            "anaerobicTrainingEffectScore",
            "aerobicTrainingEffectScore",
        )

        # Pacing entre appels DETAIL pour éviter rate-limit Garmin.
        # 30 activités * 1s ≈ 30s — acceptable pour un enrichissement utilisateur.
        detail_pacing_seconds = 1.0
        # Garde-fou : si la list renvoie un volume inattendu, on coupe.
        detail_fetch_limit = 200
        detail_fetched_count = 0
        detail_failed_count = 0
        detail_rate_limited = False

        activities = []
        field_coverage = {}
        for raw in raw_activities or []:
            if not isinstance(raw, dict):
                continue

            # Enrichissement via endpoint DETAIL : merge des champs Firstbeat
            # absents du summary LIST (EPOC, recoveryTime, etc.).
            activity_id = raw.get("activityId") or raw.get("activityIdStr")
            if (
                activity_id is not None
                and not detail_rate_limited
                and detail_fetched_count < detail_fetch_limit
            ):
                try:
                    details = api.get_activity(activity_id)
                    detail_fetched_count += 1
                    summary_dto = (details or {}).get("summaryDTO") if isinstance(details, dict) else None
                    if isinstance(summary_dto, dict):
                        for detail_key in detail_only_keys:
                            value = summary_dto.get(detail_key)
                            if value is not None:
                                raw[detail_key] = value
                except GarminConnectTooManyRequestsError:
                    # On stoppe l'enrichissement détail mais on garde les
                    # données list déjà fetchées (pas de perte utilisateur).
                    detail_rate_limited = True
                except (GarminConnectAuthenticationError, GarthHTTPError) as detail_exc:
                    # Session expirée pendant l'enrichissement → on remonte.
                    detail_status = get_http_status_from_exception(detail_exc)
                    if detail_status in (401, 403):
                        return {
                            "status": "expired",
                            "code": "GARMINCONNECT_SESSION_EXPIRED",
                            "message": "Session Garmin expiree.",
                            "activities": [],
                        }
                    detail_failed_count += 1
                except Exception:  # pylint: disable=broad-except
                    # Échec ponctuel d'une activité : on tolère et on continue.
                    detail_failed_count += 1
                finally:
                    time.sleep(detail_pacing_seconds)

            kept = {key: raw.get(key) for key in kept_keys if key in raw}
            for key, value in kept.items():
                if value is not None:
                    field_coverage[key] = field_coverage.get(key, 0) + 1
            activities.append(kept)

        return {
            "status": "success",
            "activities": activities,
            "count": len(activities),
            "fieldCoverage": field_coverage,
            "detailFetchedCount": detail_fetched_count,
            "detailFailedCount": detail_failed_count,
            "detailRateLimited": detail_rate_limited,
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

    if operation == "fetch_recovery_days":
        write_response(fetch_recovery_days(request))
        return

    if operation == "fetch_activities":
        write_response(fetch_activities(request))
        return

    write_response(build_error("GARMINCONNECT_UNSUPPORTED_OPERATION", "Operation non supportee."))


if __name__ == "__main__":
    main()
