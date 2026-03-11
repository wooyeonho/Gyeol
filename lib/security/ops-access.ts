type UserLike = {
  id?: string | null;
};

function getOpsAdminUserIds() {
  return (process.env.OPS_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isOpsAdminUser(user: UserLike | null | undefined) {
  const adminIds = getOpsAdminUserIds();
  if (adminIds.length === 0) return false;
  return Boolean(user?.id && adminIds.includes(user.id));
}
