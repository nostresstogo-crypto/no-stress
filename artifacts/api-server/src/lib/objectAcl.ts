/**
 * Storage-driver agnostic ACL helpers.
 *
 * `StorageObject` (defined in objectStorage.ts) carries get/setAclPolicy
 * methods, so these helpers are now thin wrappers. They are kept as
 * standalone exports for backward compatibility.
 */
import type { StorageObject } from "./objectStorage.js";

// Can be flexibly defined according to the use case.
export enum ObjectAccessGroupType {}

export interface ObjectAccessGroup {
  type: ObjectAccessGroupType;
  id: string;
}

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclRule {
  group: ObjectAccessGroup;
  permission: ObjectPermission;
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
  aclRules?: Array<ObjectAclRule>;
}

function isPermissionAllowed(
  requested: ObjectPermission,
  granted: ObjectPermission,
): boolean {
  if (requested === ObjectPermission.READ) {
    return [ObjectPermission.READ, ObjectPermission.WRITE].includes(granted);
  }
  return granted === ObjectPermission.WRITE;
}

abstract class BaseObjectAccessGroup implements ObjectAccessGroup {
  constructor(
    public readonly type: ObjectAccessGroupType,
    public readonly id: string,
  ) {}
  public abstract hasMember(userId: string): Promise<boolean>;
}

function createObjectAccessGroup(
  group: ObjectAccessGroup,
): BaseObjectAccessGroup {
  switch (group.type) {
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}

export async function setObjectAclPolicy(
  objectFile: StorageObject,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  await objectFile.setAclPolicy(aclPolicy);
}

export async function getObjectAclPolicy(
  objectFile: StorageObject,
): Promise<ObjectAclPolicy | null> {
  return objectFile.getAclPolicy();
}

export async function canAccessObject({
  userId,
  objectFile,
  requestedPermission,
}: {
  userId?: string;
  objectFile: StorageObject;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  const aclPolicy = await objectFile.getAclPolicy();
  if (!aclPolicy) return false;

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }
  if (!userId) return false;
  if (aclPolicy.owner === userId) return true;

  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (
      (await accessGroup.hasMember(userId)) &&
      isPermissionAllowed(requestedPermission, rule.permission)
    ) {
      return true;
    }
  }
  return false;
}
