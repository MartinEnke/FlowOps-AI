export type OperatorRole = "viewer" | "operator" | "supervisor";

export type Operator = {
  id: string;
  name: string;
  role: OperatorRole;
  token: string;
};

// Static operators (replace later with DB if needed)
export const OPERATORS: Operator[] = [
  {
    id: "op_viewer",
    name: "Read Only",
    role: "viewer",
    token: "viewer-token"
  },
  {
    id: "op_operator",
    name: "Support Agent",
    role: "operator",
    token: "operator-token"
  },
  {
    id: "op_supervisor",
    name: "Supervisor",
    role: "supervisor",
    token: "supervisor-token"
  }
];

export function getOperatorByToken(token: string | undefined) {
  if (!token) return null;
  return OPERATORS.find((o) => o.token === token) ?? null;
}
