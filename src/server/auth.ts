import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  MIN_ADMIN_PASSWORD_LENGTH,
  MIN_ADMIN_USERNAME_LENGTH,
  normalizeAdminUsername,
} from "@/lib/admin-auth";
import { getAdminBackendStatus } from "@/server/admin-backend";
import { isDatabaseUnavailableError } from "@/server/database-errors";
import { verifyPasswordHash } from "@/server/passwords";
import {
  countAdminUsers,
  createAdminSessionRecord,
  deleteAdminSessionByToken,
  findActiveAdminSessionByToken,
  findAdminUserByUsername,
} from "@/server/repositories/admin-auth";

type AdminSignInResult =
  | {
      ok: true;
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

  const backendStatus = await getAdminBackendStatus();

  if (backendStatus === "missing_database") {
    return {
      ok: false,
      error: "后台还没有连接数据库，请先完成初始化。",
    };
  }

  if (backendStatus === "database_unavailable") {
    return {
      ok: false,
      error: "数据库当前不可用，请检查连接后再试。",
    };
  }

  if (backendStatus === "schema_missing") {
    return {
      ok: false,
      error: "数据库表结构尚未初始化，请先运行 npm run db:push。",
    };
  }

  if (backendStatus === "needs_installation") {
    return {
      ok: false,
      error: "后台尚未完成初始化，请先前往 /install 创建站点信息和首个管理员。",
    };
  }

  const existingUserCount = await countAdminUsers();

  if (existingUserCount === 0) {
    return {
      ok: false,
      error: "当前还没有管理员帐号，请先完成初始化。",
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

  await createAdminSessionForUser(user.id);

  return {
    ok: true,
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
  try {
    if (!(await isAdminAuthenticated())) {
      redirect(createSiteLoginHref(nextPath));
    }
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      redirect("/admin");
    }

    throw error;
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

export async function createAdminSessionForUser(userId: string) {
  await createAdminSession(userId);
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
