import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/app/(app)/tasks/_lib/work-help.ts", import.meta.url),
  "utf8",
);
const output = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
new Function("exports", output)(exports);
const { workHelp } = exports;

test("every work-help topic has complete Turkish and English articles", () => {
  assert.deepEqual(
    Object.keys(workHelp.tr).sort(),
    Object.keys(workHelp.en).sort(),
  );
  assert.equal(Object.keys(workHelp.tr).length, 33);
  for (const locale of ["tr", "en"]) {
    for (const [topic, article] of Object.entries(workHelp[locale])) {
      assert(article.title.trim(), `${locale}/${topic}: title`);
      assert(
        article.meaning.length > 40,
        `${locale}/${topic}: plain-language summary`,
      );
      for (const field of ["example", "rules"]) {
        assert(article[field].length > 0, `${locale}/${topic}: ${field}`);
        assert(article[field].every((text) => text.length > 20));
        assert.equal(new Set(article[field]).size, article[field].length);
      }
      assert.notEqual(workHelp.tr[topic].meaning, workHelp.en[topic].meaning);
    }
  }
});

test("help text is static and contains no production identifiers or credentials", () => {
  assert(
    !/authedFetch|process\.env|localStorage|https?:\/\/|SMTP_|@dndcyprus/i.test(
      source,
    ),
  );
});

test("all literal help placements refer to a translated topic", () => {
  const files = [
    "page.tsx",
    "[id]/page.tsx",
    "_components/TaskForm.tsx",
    "_components/ProjectForm.tsx",
    "_components/Reports.tsx",
  ];
  let placements = 0;
  for (const file of files) {
    const text = readFileSync(
      new URL(`../src/app/(app)/tasks/${file}`, import.meta.url),
      "utf8",
    );
    const ast = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node) {
      if (
        (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
        ["WorkInfo", "WorkField"].includes(node.tagName.getText(ast))
      ) {
        const topic = node.attributes.properties.find(
          (p) => ts.isJsxAttribute(p) && p.name.getText(ast) === "topic",
        );
        if (topic?.initializer && ts.isStringLiteral(topic.initializer)) {
          assert(
            workHelp.tr[topic.initializer.text],
            `${file}: ${topic.initializer.text}`,
          );
          placements++;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert(placements >= 30);
});
