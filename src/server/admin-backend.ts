import "server-only";

import { getInstallationState } from "@/server/installation";

export type AdminBackendStatus =
  | "ready"
  | "needs_installation"
  | "missing_database"
  | "database_unavailable"
  | "schema_missing";

export async function getAdminBackendStatus(): Promise<AdminBackendStatus> {
  const state = await getInstallationState();

  if (state.installed) {
    return state.status === "ready" ? "ready" : "database_unavailable";
  }

  if (state.status === "missing_database" || state.status === "schema_missing") {
    return state.status;
  }

  return "needs_installation";
}

export function getAdminBackendStatusMessage(status: Exclude<AdminBackendStatus, "ready">) {
  if (status === "needs_installation") {
    return {
      title: "后台尚未完成初始化",
      description:
        "当前数据库里还没有完整的站点信息和管理员帐号。前往安装页完成初始化；如果数据库当前不可用，安装页会继续提示你先恢复数据库。",
    };
  }

  if (status === "missing_database") {
    return {
      title: "后台尚未连接数据库",
      description:
        "公开页面现在可以在没有数据库时继续显示，但后台管理仍然依赖数据库。先配置 DATABASE_URL 并初始化表结构，再回来登录后台。",
    };
  }

  if (status === "schema_missing") {
    return {
      title: "数据库表结构尚未初始化",
      description:
        "已经检测到 DATABASE_URL，但当前数据库里还没有 Chihiro 所需的表结构。先运行 npx prisma migrate deploy，再打开安装页完成首个管理员和站点初始化。",
    };
  }

  return {
    title: "数据库当前不可用",
    description:
      "后台暂时无法访问数据库。请先检查数据库实例、网络连通性、连接串和凭据，恢复后再进入后台。",
  };
}
