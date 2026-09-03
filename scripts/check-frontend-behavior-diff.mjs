import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import ts from "typescript";

const protectedUiFiles = new Set([
  "app/rupantar/home-page.tsx",
  "app/rupantar/public-pages.tsx",
  "app/rupantar/admin.tsx",
  "app/rupantar/blog-pages.tsx",
  "app/rupantar/blog-admin.tsx",
  "app/rupantar/shared.tsx",
  "app/rupantar/brand-intro.tsx",
]);

const operationalAttributes = new Set([
  "accept",
  "action",
  "aria-busy",
  "autoComplete",
  "checked",
  "defaultChecked",
  "defaultValue",
  "disabled",
  "formAction",
  "href",
  "inputMode",
  "method",
  "multiple",
  "name",
  "readOnly",
  "required",
  "role",
  "tabIndex",
  "target",
  "type",
  "value",
]);

const protectedDeclarations = new Set([
  "HomePageProps",
  "AdminPortalProps",
  "acceptedPhoto",
  "isInteractiveTarget",
  "maximumAttachmentBytes",
  "acceptedAttachmentTypes",
  "normalizeWhatsAppNumber",
  "leadWhatsAppUrl",
  "seenLeadsStorageKey",
  "adminTabs",
]);

const gatingPattern = /\b(?:busy|loading|uploadingImages|leadsHasMore|leadsLoadingOlder|estimateBusy|queryBusy|visibleWorks|total|maximumAttachmentBytes|acceptedAttachmentTypes)\b/;
const protectedCallbackPattern = /^(?:on[A-Z]|navigate$)/;

function normalize(value) {
  return value.replace(/\s+/g, " ").trim();
}

function printerText(node, sourceFile) {
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  return normalize(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));
}

function expressionName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) {
    const left = expressionName(expression.expression);
    return left ? `${left}.${expression.name.text}` : expression.name.text;
  }
  if (ts.isElementAccessExpression(expression)) return expressionName(expression.expression);
  return "";
}

function openingTagFor(attribute) {
  const attributes = attribute.parent;
  const opening = attributes?.parent;
  if (!opening || (!ts.isJsxOpeningElement(opening) && !ts.isJsxSelfClosingElement(opening))) return "unknown";
  return opening.tagName.getText();
}

function behaviorSignature(fileName, source) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const signatures = [];

  function add(kind, value) {
    signatures.push(`${kind}:${normalize(value)}`);
  }

  function visit(node) {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText();
      if (name.startsWith("on") || operationalAttributes.has(name)) {
        add(`jsx:${openingTagFor(node)}:${name}`, node.initializer ? printerText(node.initializer, sourceFile) : "true");
      }
    }

    if (ts.isCallExpression(node)) {
      const callee = expressionName(node.expression);
      const callText = printerText(node, sourceFile);
      if (
        protectedCallbackPattern.test(callee) ||
        callee === "window.location.assign" ||
        callee === "window.alert" ||
        callee.endsWith(".preventDefault") ||
        (callee === "useEffect" && gatingPattern.test(callText))
      ) {
        add(`call:${callee}`, callText);
      }
    }

    if (
      ts.isBinaryExpression(node) ||
      ts.isConditionalExpression(node) ||
      ts.isPrefixUnaryExpression(node) ||
      ts.isPostfixUnaryExpression(node)
    ) {
      const expressionText = printerText(node, sourceFile);
      if (gatingPattern.test(expressionText)) add(`gate:${ts.SyntaxKind[node.kind]}`, expressionText);
    }

    if (ts.isFunctionDeclaration(node) && node.name && protectedDeclarations.has(node.name.text)) {
      add(`function:${node.name.text}`, printerText(node, sourceFile));
    }

    if (ts.isTypeAliasDeclaration(node) && protectedDeclarations.has(node.name.text)) {
      add(`type:${node.name.text}`, printerText(node, sourceFile));
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && protectedDeclarations.has(node.name.text)) {
      add(`variable:${node.name.text}`, printerText(node, sourceFile));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return signatures.sort();
}

function changedFiles(baseSha) {
  return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", `${baseSha}...HEAD`], { encoding: "utf8" })
    .split(/\r?\n/)
    .map((value) => value.trim().replaceAll("\\", "/"))
    .filter(Boolean);
}

function fileAt(ref, path) {
  try {
    return execFileSync("git", ["show", `${ref}:${path}`], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return "";
  }
}

function headFile(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function firstDifference(before, after) {
  const maximum = Math.max(before.length, after.length);
  for (let index = 0; index < maximum; index += 1) {
    if (before[index] !== after[index]) return { before: before[index] ?? "<missing>", after: after[index] ?? "<missing>" };
  }
  return null;
}

function selfTest() {
  const base = `
    import { useState } from "react";
    export function Sample({ onSave, busy }) {
      const [value, setValue] = useState("");
      return <form onSubmit={(event) => { event.preventDefault(); onSave(value); }}>
        <input value={value} onChange={(event) => setValue(event.target.value)} required className="old" />
        <button type="submit" disabled={busy} className="old-button">Save</button>
      </form>;
    }
  `;
  const visualOnly = base.replace('className="old"', 'className="new"').replace('className="old-button"', 'className="new-button"').replace(">Save<", ">Publish<");
  const behaviorChange = base.replace("onSave(value)", "onSave('different')");
  const gateChange = base.replace("disabled={busy}", "disabled={false}");

  const original = behaviorSignature("sample.tsx", base);
  if (JSON.stringify(original) !== JSON.stringify(behaviorSignature("sample.tsx", visualOnly))) {
    throw new Error("Self-test failed: visual-only changes changed the behavior signature.");
  }
  if (JSON.stringify(original) === JSON.stringify(behaviorSignature("sample.tsx", behaviorChange))) {
    throw new Error("Self-test failed: event behavior change was not detected.");
  }
  if (JSON.stringify(original) === JSON.stringify(behaviorSignature("sample.tsx", gateChange))) {
    throw new Error("Self-test failed: disabled/busy gate change was not detected.");
  }
  console.log("PASS: frontend behavior guard self-test.");
}

if (process.argv.includes("--self-test")) {
  selfTest();
  process.exit(0);
}

const baseSha = process.argv[2]?.trim();
if (!baseSha) {
  console.error("Frontend behavior guard: missing base commit SHA.");
  process.exit(2);
}

selfTest();

const protectedChanges = changedFiles(baseSha).filter((path) => protectedUiFiles.has(path));
if (!protectedChanges.length) {
  console.log("PASS: no protected frontend component changed.");
  process.exit(0);
}

const failures = [];
for (const path of protectedChanges) {
  const before = behaviorSignature(path, fileAt(baseSha, path));
  const after = behaviorSignature(path, headFile(path));
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    failures.push({ path, difference: firstDifference(before, after) });
  }
}

if (failures.length) {
  console.error("\nFRONTEND RELIABILITY BOUNDARY FAILED\n");
  console.error("This frontend-only PR changed behavior-bearing code inside an otherwise UI-approved React file.");
  console.error("Visual work may change JSX presentation, className, inline style, spacing, copy, images, and CSS/motion. It may not change event wiring, form semantics, navigation callbacks, busy/loading gates, validation, or protected reliability helpers.\n");
  for (const failure of failures) {
    console.error(` - ${failure.path}`);
    if (failure.difference) {
      console.error(`   baseline: ${failure.difference.before}`);
      console.error(`   changed:  ${failure.difference.after}`);
    }
  }
  console.error("\nIf behavior genuinely needs to change, stop the frontend-only PR and open a separate reliability-reviewed branch with targeted tests and an intentional production-baseline update.");
  process.exit(1);
}

console.log(`PASS: behavior signatures preserved across ${protectedChanges.length} protected frontend file(s).`);
