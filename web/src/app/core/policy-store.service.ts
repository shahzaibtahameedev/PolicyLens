import { computed, Injectable, signal } from "@angular/core";
import { INITIAL_POLICY_FILES } from "./mock-data";
import type { PolicyFileRecord, PolicyRuleItem, RegoValidationError, SeverityLevel } from "./models";

const RULE_COMMENT_PATTERN = /^#\s*([A-Za-z0-9_-]+)\s*·\s*(High|Medium|Low)\s*·\s*(.+)$/;
const PACKAGE_DECLARATION_PATTERN = /^package\s+([A-Za-z0-9_.]+)/m;
const DEFAULT_UPDATED_AUTHOR = "Maya Kessler";

@Injectable({ providedIn: "root" })
export class PolicyStoreService {
    readonly policyFiles = signal<PolicyFileRecord[]>(INITIAL_POLICY_FILES);
    readonly totalRuleCount = computed(() => {
        const files = this.policyFiles();
        let total = 0;

        for (const file of files) {
            total += file.rules.length;
        }

        return total;
    });

    findById(fileId: string): PolicyFileRecord | undefined {
        const files = this.policyFiles();
        const found = files.find((file) => file.id === fileId);

        return found;
    }

    validateRego(code: string): RegoValidationError | null {
        const lines = code.split("\n");
        const hasPackage = PACKAGE_DECLARATION_PATTERN.test(code);

        if (!hasPackage) {
            return {
                code: "rego_parse_error",
                message: "missing package declaration",
                line: 1,
                column: 1,
            };
        }

        let braceDepth = 0;

        for (let index = 0; index < lines.length; index += 1) {
            const lineNumber = index + 1;
            const lineText = lines[index];
            const trimmed = lineText.trim();
            const startsWithAssign = trimmed.startsWith(":=");

            if (startsWithAssign) {
                const colIndex = lineText.indexOf(":=") + 1;

                return {
                    code: "rego_parse_error",
                    message: "unexpected token ':='",
                    line: lineNumber,
                    column: colIndex,
                };
            }

            for (const character of lineText) {
                if (character === "{") {
                    braceDepth += 1;
                } else if (character === "}") {
                    braceDepth -= 1;

                    if (braceDepth < 0) {
                        return {
                            code: "rego_parse_error",
                            message: "unexpected '}' token",
                            line: lineNumber,
                            column: 1,
                        };
                    }
                }
            }
        }

        if (braceDepth > 0) {
            return {
                code: "rego_parse_error",
                message: "unclosed '{' block",
                line: lines.length,
                column: 1,
            };
        }

        return null;
    }

    savePolicy(fileId: string, updatedCode: string): PolicyFileRecord | null {
        const existing = this.findById(fileId);

        if (!existing) {
            return null;
        }

        const parsedRules = this.parseRulesFromCode(updatedCode, existing.rules);
        const packageMatch = PACKAGE_DECLARATION_PATTERN.exec(updatedCode);
        const packageName = packageMatch ? packageMatch[1] : existing.packageName;

        const updatedRecord: PolicyFileRecord = {
            id: existing.id,
            fileName: existing.fileName,
            packageName,
            filePath: existing.filePath,
            appliesTo: existing.appliesTo,
            appliesToSummary: existing.appliesToSummary,
            updatedDate: "just now",
            updatedBy: DEFAULT_UPDATED_AUTHOR,
            code: updatedCode,
            rules: parsedRules,
        };

        this.policyFiles.update((files) =>
            files.map((file) => {
                const isTarget = file.id === fileId;

                if (!isTarget) {
                    return file;
                }

                return updatedRecord;
            }),
        );

        return updatedRecord;
    }

    addUploadedPolicy(fileName: string, code: string): PolicyFileRecord {
        const normalizedName = fileName.endsWith(".rego") ? fileName : `${fileName}.rego`;
        const packageMatch = PACKAGE_DECLARATION_PATTERN.exec(code);
        const packageName = packageMatch ? packageMatch[1] : `policylens.azure.${normalizedName.replace(".rego", "")}`;
        const parsedRules = this.parseRulesFromCode(code, []);

        const newRecord: PolicyFileRecord = {
            id: normalizedName,
            fileName: normalizedName,
            packageName,
            filePath: `policies/${normalizedName}`,
            appliesTo: ["App Service"],
            appliesToSummary: "App Service",
            updatedDate: "just now",
            updatedBy: DEFAULT_UPDATED_AUTHOR,
            code,
            rules: parsedRules,
        };

        this.policyFiles.update((files) => [newRecord, ...files.filter((file) => file.id !== normalizedName)]);

        return newRecord;
    }

    private parseRulesFromCode(code: string, fallbackRules: PolicyRuleItem[]): PolicyRuleItem[] {
        const lines = code.split("\n");
        const parsed: PolicyRuleItem[] = [];

        for (let index = 0; index < lines.length; index += 1) {
            const trimmed = lines[index].trim();
            const match = RULE_COMMENT_PATTERN.exec(trimmed);

            if (match) {
                const id = match[1];
                const severity = match[2] as SeverityLevel;
                const title = match[3].trim();

                parsed.push({
                    id,
                    severity,
                    title,
                    line: index + 1,
                });
            }
        }

        const hasParsedRules = parsed.length > 0;

        if (hasParsedRules) {
            return parsed;
        }

        return fallbackRules;
    }
}
