// Keep unsaved signed-in statements in memory, never in a URL or navigation history.
const statements = new Map<string, string>();
export const setStatementDraft = (matterId: string, statement: string) => statements.set(matterId, statement);
export const getStatementDraft = (matterId: string) => statements.get(matterId);
export const clearStatementDraft = (matterId: string) => statements.delete(matterId);
