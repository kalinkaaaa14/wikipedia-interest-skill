// Enforces the code rules from the project's CLAUDE.md.
import stylistic from '@stylistic/eslint-plugin';
import type { Rule } from 'eslint';
import { defineConfig } from 'eslint/config';
import unicorn from 'eslint-plugin-unicorn';
import type { Declaration, ExportNamedDeclaration } from 'estree';
import tseslint from 'typescript-eslint';

/** kebab-case form of an exported name: analyzeSeries → analyze-series, CONFIDENCE_FACTOR → confidence-factor. */
function toKebabCase(name: string): string {
  return name.replace(/_/g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function declaredNames(declaration: Declaration): string[] {
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.map((declarator) => (declarator.id.type === 'Identifier' ? declarator.id.name : '?'));
  }

  // Functions, classes and (at runtime) TypeScript type aliases all carry an `id`.
  return 'id' in declaration && declaration.id ? [declaration.id.name] : ['?'];
}

function exportedNames(statement: ExportNamedDeclaration): string[] {
  if (statement.declaration) {
    return declaredNames(statement.declaration);
  }

  return statement.specifiers.map((specifier) => (specifier.exported.type === 'Identifier' ? specifier.exported.name : String(specifier.exported.value)));
}

const oneExportPerFile: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      tooMany: 'One export per file (this file has {{count}}: {{names}}).',
      wrongName: 'Name the file "{{expected}}.ts" after its export "{{name}}".',
    },
  },
  create(context) {
    return {
      Program(program) {
        const names: string[] = [];

        for (const statement of program.body) {
          if (statement.type === 'ExportDefaultDeclaration') {
            names.push('default');
          } else if (statement.type === 'ExportNamedDeclaration') {
            names.push(...exportedNames(statement));
          }
        }

        if (names.length > 1) {
          context.report({ node: program, messageId: 'tooMany', data: { count: String(names.length), names: names.join(', ') } });

          return;
        }

        const fileName = context.filename.split('/').at(-1)!.replace(/\.ts$/, '');

        if (names.length === 1 && names[0] !== 'default' && toKebabCase(names[0]) !== fileName) {
          context.report({ node: program, messageId: 'wrongName', data: { expected: toKebabCase(names[0]), name: names[0] } });
        }
      },
    };
  },
};

export default defineConfig(
  { ignores: ['node_modules/**', '.cache/**', 'evals/runs/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      '@stylistic': stylistic,
      unicorn,
      local: { rules: { 'one-export-per-file': oneExportPerFile } },
    },
    rules: {
      'id-length': ['error', { min: 2, exceptions: ['i'], properties: 'never' }],
      curly: ['error', 'all'],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: false }],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'if' },
        { blankLine: 'always', prev: 'if', next: '*' },
      ],
      'no-nested-ternary': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'local/one-export-per-file': 'error',
    },
  },
  {
    // Types live in their own files under types/; everywhere else object types must be named there.
    files: ['scripts/**/*.ts', 'tests/**/*.ts', 'evals/**/*.ts'],
    ignores: ['**/types/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'TSTypeAliasDeclaration', message: 'Move this type to its own file under types/ (CLAUDE.md).' },
        { selector: 'TSInterfaceDeclaration', message: 'Use a type in its own file under types/, not an interface (CLAUDE.md).' },
        { selector: 'TSTypeLiteral', message: 'Name this object type and move it to types/ (CLAUDE.md).' },
      ],
    },
  },
);
