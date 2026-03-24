export async function auditLog(
  db: any,
  params: {
    businessId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
  }
) {
  try {
    await db.query(
      `INSERT INTO audit_logs
       (business_id, user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        params.businessId,
        params.userId,
        params.action,
        params.entityType,
        params.entityId,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
      ]
    );
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}