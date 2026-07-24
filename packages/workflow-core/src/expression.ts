/**
 * Safe expression evaluator for business rules and edge conditions.
 * Supports field paths, comparisons, logical ops, and simple arithmetic.
 * Does NOT use eval() — sandboxed recursive descent parser.
 */

export type ExprValue = string | number | boolean | null | ExprValue[] | { [k: string]: ExprValue };

export class ExpressionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressionError";
  }
}

type Token =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: string }
  | { kind: "punct"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "null" };

const OPS = [
  "===",
  "!==",
  "==",
  "!=",
  ">=",
  "<=",
  "&&",
  "||",
  ">",
  "<",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let s = "";
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === "\\") {
          i++;
          s += input[i] ?? "";
        } else {
          s += input[i];
        }
        i++;
      }
      i++; // closing quote
      tokens.push({ kind: "string", value: s });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i]!)) {
        num += input[i];
        i++;
      }
      tokens.push({ kind: "number", value: Number(num) });
      continue;
    }
    if (/[a-zA-Z_$]/.test(ch)) {
      let ident = "";
      while (i < input.length && /[a-zA-Z0-9_$.]/.test(input[i]!)) {
        ident += input[i];
        i++;
      }
      if (ident === "true") tokens.push({ kind: "bool", value: true });
      else if (ident === "false") tokens.push({ kind: "bool", value: false });
      else if (ident === "null") tokens.push({ kind: "null" });
      else tokens.push({ kind: "ident", value: ident });
      continue;
    }
    let matched = false;
    for (const op of OPS) {
      if (input.slice(i, i + op.length) === op) {
        tokens.push({ kind: "op", value: op });
        i += op.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    if ("()[],".includes(ch)) {
      tokens.push({ kind: "punct", value: ch });
      i++;
      continue;
    }
    throw new ExpressionError(`Unexpected character '${ch}' at position ${i}`);
  }
  return tokens;
}

function resolvePath(path: string, ctx: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

class Parser {
  private pos = 0;
  constructor(
    private tokens: Token[],
    private ctx: Record<string, unknown>
  ) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new ExpressionError("Unexpected end of expression");
    this.pos++;
    return t;
  }

  private matchOp(...ops: string[]): boolean {
    const t = this.peek();
    if (t?.kind === "op" && ops.includes(t.value)) {
      this.pos++;
      return true;
    }
    return false;
  }

  parse(): unknown {
    const result = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new ExpressionError("Unexpected tokens after expression");
    }
    return result;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.matchOp("||")) {
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseEquality();
    while (this.matchOp("&&")) {
      const right = this.parseEquality();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseEquality(): unknown {
    let left = this.parseComparison();
    while (true) {
      if (this.matchOp("==", "===")) {
        left = left === this.parseComparison();
      } else if (this.matchOp("!=", "!==")) {
        left = left !== this.parseComparison();
      } else break;
    }
    return left;
  }

  private parseComparison(): unknown {
    let left = this.parseAdd();
    while (true) {
      if (this.matchOp(">")) left = Number(left) > Number(this.parseAdd());
      else if (this.matchOp("<")) left = Number(left) < Number(this.parseAdd());
      else if (this.matchOp(">=")) left = Number(left) >= Number(this.parseAdd());
      else if (this.matchOp("<=")) left = Number(left) <= Number(this.parseAdd());
      else break;
    }
    return left;
  }

  private parseAdd(): unknown {
    let left = this.parseMul();
    while (true) {
      if (this.matchOp("+")) {
        const right = this.parseMul();
        if (typeof left === "string" || typeof right === "string") {
          left = String(left) + String(right);
        } else {
          left = Number(left) + Number(right);
        }
      } else if (this.matchOp("-")) {
        left = Number(left) - Number(this.parseMul());
      } else break;
    }
    return left;
  }

  private parseMul(): unknown {
    let left = this.parseUnary();
    while (true) {
      if (this.matchOp("*")) left = Number(left) * Number(this.parseUnary());
      else if (this.matchOp("/")) left = Number(left) / Number(this.parseUnary());
      else if (this.matchOp("%")) left = Number(left) % Number(this.parseUnary());
      else break;
    }
    return left;
  }

  private parseUnary(): unknown {
    if (this.matchOp("!")) return !this.parseUnary();
    if (this.matchOp("-")) return -Number(this.parseUnary());
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const t = this.peek();
    if (!t) throw new ExpressionError("Unexpected end of expression");

    if (t.kind === "number") {
      this.consume();
      return t.value;
    }
    if (t.kind === "string") {
      this.consume();
      return t.value;
    }
    if (t.kind === "bool") {
      this.consume();
      return t.value;
    }
    if (t.kind === "null") {
      this.consume();
      return null;
    }
    if (t.kind === "ident") {
      this.consume();
      // function call?
      if (this.peek()?.kind === "punct" && (this.peek() as { value: string }).value === "(") {
        return this.parseFunctionCall(t.value);
      }
      return resolvePath(t.value, this.ctx);
    }
    if (t.kind === "punct" && t.value === "(") {
      this.consume();
      const inner = this.parseOr();
      const close = this.consume();
      if (close.kind !== "punct" || close.value !== ")") {
        throw new ExpressionError("Expected closing parenthesis");
      }
      return inner;
    }
    throw new ExpressionError(`Unexpected token: ${JSON.stringify(t)}`);
  }

  private parseFunctionCall(name: string): unknown {
    this.consume(); // (
    const args: unknown[] = [];
    if (!(this.peek()?.kind === "punct" && (this.peek() as { value: string }).value === ")")) {
      args.push(this.parseOr());
      while (this.peek()?.kind === "punct" && (this.peek() as { value: string }).value === ",") {
        this.consume();
        args.push(this.parseOr());
      }
    }
    const close = this.consume();
    if (close.kind !== "punct" || close.value !== ")") {
      throw new ExpressionError("Expected closing parenthesis in function call");
    }
    return callBuiltin(name, args);
  }
}

function callBuiltin(name: string, args: unknown[]): unknown {
  switch (name) {
    case "len":
    case "length":
      return Array.isArray(args[0])
        ? args[0].length
        : typeof args[0] === "string"
          ? args[0].length
          : 0;
    case "includes":
      return Array.isArray(args[0])
        ? args[0].includes(args[1])
        : String(args[0] ?? "").includes(String(args[1] ?? ""));
    case "lower":
      return String(args[0] ?? "").toLowerCase();
    case "upper":
      return String(args[0] ?? "").toUpperCase();
    case "abs":
      return Math.abs(Number(args[0]));
    case "round":
      return Math.round(Number(args[0]));
    case "floor":
      return Math.floor(Number(args[0]));
    case "ceil":
      return Math.ceil(Number(args[0]));
    case "now":
      return Date.now();
    case "daysBetween": {
      const a = new Date(String(args[0])).getTime();
      const b = new Date(String(args[1])).getTime();
      return Math.floor(Math.abs(b - a) / 86_400_000);
    }
    case "isEmpty":
      return args[0] == null || args[0] === "" || (Array.isArray(args[0]) && args[0].length === 0);
    case "coalesce":
      return args.find((a) => a != null && a !== "") ?? null;
    case "matches":
      return new RegExp(String(args[1])).test(String(args[0] ?? ""));
    default:
      throw new ExpressionError(`Unknown function: ${name}`);
  }
}

/**
 * Evaluate a sandboxed expression against a context object.
 * Supports: comparisons, logic, arithmetic, field paths, and builtin helpers.
 */
export function evaluateExpression(
  expression: string,
  context: Record<string, unknown> = {}
): unknown {
  const trimmed = expression.trim();
  if (!trimmed) return true;
  // Support ${...} template wrapping
  const expr = trimmed.startsWith("${") && trimmed.endsWith("}")
    ? trimmed.slice(2, -1).trim()
    : trimmed;
  const tokens = tokenize(expr);
  if (tokens.length === 0) return true;
  return new Parser(tokens, context).parse();
}

export function evaluateBoolean(
  expression: string,
  context: Record<string, unknown> = {}
): boolean {
  return Boolean(evaluateExpression(expression, context));
}
