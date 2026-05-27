/* eslint-env node */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { csrfMiddleware } from "./csrf.middleware.js";

// Minimal req/res fakes — pas d'Express, on teste juste la logique.

function buildReq({ method = "GET", path = "/test", cookie = "", header } = {}) {
  return {
    method,
    path,
    headers: {
      cookie,
      ...(header !== undefined ? { "x-csrf-token": header } : {}),
    },
  };
}

function buildRes() {
  const cookies = [];
  const headers = {};
  return {
    cookies,
    headers,
    cookie(name, value, opts) {
      cookies.push({ name, value, opts });
    },
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

describe("csrfMiddleware (Lot 2)", () => {
  it("genere un cookie csrf sur GET sans cookie existant", () => {
    const req = buildReq({ method: "GET" });
    const res = buildRes();
    let calledNext = false;
    csrfMiddleware(req, res, () => { calledNext = true; });
    assert.equal(calledNext, true);
    assert.equal(res.cookies.length, 1);
    assert.equal(res.cookies[0].name, "runsee_csrf");
    assert.ok(res.cookies[0].value.length > 20, "token devrait etre robuste");
    assert.equal(res.cookies[0].opts.httpOnly, true, "doit etre httpOnly (token transmis via header X-CSRF-Token)");
    assert.equal(res.headers["X-CSRF-Token"], res.cookies[0].value, "le header doit relayer le token");
  });

  it("ne regenere pas le cookie si deja present", () => {
    const req = buildReq({ method: "GET", cookie: "runsee_csrf=existing-token" });
    const res = buildRes();
    csrfMiddleware(req, res, () => {});
    assert.equal(res.cookies.length, 0);
  });

  it("rejette POST sans header CSRF", () => {
    const req = buildReq({ method: "POST", cookie: "runsee_csrf=abc123" });
    const res = buildRes();
    let err = null;
    csrfMiddleware(req, res, (e) => { err = e; });
    assert.ok(err, "doit appeler next(err)");
    assert.equal(err.httpStatus, 403);
    assert.equal(err.code, "CSRF_INVALID");
  });

  it("rejette POST avec header CSRF qui ne matche pas le cookie", () => {
    const req = buildReq({
      method: "POST",
      cookie: "runsee_csrf=abc123",
      header: "wrong-token",
    });
    const res = buildRes();
    let err = null;
    csrfMiddleware(req, res, (e) => { err = e; });
    assert.ok(err);
    assert.equal(err.httpStatus, 403);
  });

  it("accepte POST avec header CSRF qui matche le cookie", () => {
    const req = buildReq({
      method: "POST",
      cookie: "runsee_csrf=abc123",
      header: "abc123",
    });
    const res = buildRes();
    let calledNext = false;
    let err = null;
    csrfMiddleware(req, res, (e) => {
      if (e) err = e;
      else calledNext = true;
    });
    assert.equal(err, null);
    assert.equal(calledNext, true);
  });

  it("exempte /auth/strava/callback (OAuth redirect tiers)", () => {
    const req = buildReq({
      method: "POST",
      path: "/auth/strava/callback",
      cookie: "runsee_csrf=abc123",
      // pas de header
    });
    const res = buildRes();
    let err = null;
    let calledNext = false;
    csrfMiddleware(req, res, (e) => {
      if (e) err = e;
      else calledNext = true;
    });
    assert.equal(err, null);
    assert.equal(calledNext, true);
  });

  it("accepte HEAD et OPTIONS sans header (methodes safe)", () => {
    for (const method of ["HEAD", "OPTIONS"]) {
      const req = buildReq({ method, cookie: "runsee_csrf=abc123" });
      const res = buildRes();
      let calledNext = false;
      csrfMiddleware(req, res, () => { calledNext = true; });
      assert.equal(calledNext, true, `${method} doit passer sans header`);
    }
  });

  it("DELETE et PATCH sont consideres comme mutants", () => {
    for (const method of ["DELETE", "PATCH", "PUT"]) {
      const req = buildReq({ method, cookie: "runsee_csrf=abc123" });
      const res = buildRes();
      let err = null;
      csrfMiddleware(req, res, (e) => { err = e; });
      assert.ok(err, `${method} doit etre rejete sans header`);
      assert.equal(err.httpStatus, 403);
    }
  });
});
