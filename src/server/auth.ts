import "server-only";

import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  MIN_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_USERNAME_LENGTH,
  normalizeAdminUsername,
} from "@/lib/admin-auth";
import {
  countAdminUsers,
  createAdminSessionRecord,
  createAdminUser,
  deleteAdminSessionByToken,
  findActiveAdminSessionByToken,
  findAdminUserByUsername,
} from "@/server/repositories/admin-auth";

const scrypt = promisify(nodeScrypt);

type AdminSignInResult =
  | {
      ok: true;
      created: boolean;
    }
  | {
      ok: false;
      error: string;
    };

export async function hasAdminUsers() {
  return (await countAdminUsers()) > 0;
}

export async function isAdminAuthenticated() {
  return Boolean(await getCurrentAdminSession());
}

export async function signInAdmin(username: string, password: string): Promise<AdminSignInResult> {
  const normalizedUsername = normalizeAdminUsername(username);
  const normalizedPassword = password.trim();

  if (normalizedUsername.length < MIN_ADMIN_USERNAME_LENGTH) {
    return {
      ok: false,
      error: `帐号至少需要 ${MIN_ADMIN_USERNAME_LENGTH} 个字符。`,
    };
  }

  if (normalizedPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `密码至少需要 ${MIN_ADMIN_PASSWORD_LENGTH} 个字符。`,
    };
  }

  const existingUserCount = await countAdminUsers();

  if (existingUserCount === 0) {
    const passwordHash = await hashPassword(normalizedPassword);
    const user = await createAdminUser(normalizedUsername, passwordHash);

    await createAdminSession(user.id);

    return {
      ok: true,
      created: true,
    };
  }

  const user = await findAdminUserByUsername(normalizedUsername);

  if (!user) {
    return {
      ok: false,
      error: "帐号或密码不正确。",
    };
  }

  const passwordMatches = await verifyPasswordHash(normalizedPassword, user.passwordHash);

  if (!passwordMatches) {
    return {
      ok: false,
      error: "帐号或密码不正确。",
    };
  }

  await createAdminSession(user.id);

  return {
    ok: true,
    created: false,
  };
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    await deleteAdminSessionByToken(token);
  }

  clearAdminSessionCookie(cookieStore);
}

export async function requireAdminSession(nextPath = "/admin") {
  if (!(await isAdminAuthenticated())) {
    redirect(createSiteLoginHref(nextPath));
  }
}

async function createAdminSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000);
  await createAdminSessionRecord(userId, token, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });
}

async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await findActiveAdminSessionByToken(token);

  if (!session) {
    clearAdminSessionCookie(cookieStore);
    return null;
  }

  return session;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

async function verifyPasswordHash(password: string, storedHash: string) {
  const [saltHex, hashHex] = storedHash.split(":");

  if (!saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, "hex");
  const expectedHash = Buffer.from(hashHex, "hex");
  const derivedKey = (await scrypt(password, salt, expectedHash.length)) as Buffer;

  if (derivedKey.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, expectedHash);
}

function clearAdminSessionCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

function createSiteLoginHref(nextPath: string) {
  const params = new URLSearchParams();
  params.set("admin-login", "1");
  params.set("next", nextPath.startsWith("/admin") ? nextPath : "/admin");
  return `/?${params.toString()}`;
}
