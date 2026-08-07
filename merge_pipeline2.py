import re

old_path = "scratch/old_pipeline_utf8.ts"
current_path = "src/lib/pipeline.server.ts"

with open(old_path, 'r', encoding='utf-8') as f:
    old_content = f.read()

with open(current_path, 'r', encoding='utf-8') as f:
    current_content = f.read()

# Extract runPlagiarismCheckImpl
start2 = old_content.find("export async function runPlagiarismCheckImpl(db: DB, userId: string, projectId: string) {")
end2 = old_content.find("return plagiarismResult;\n}", start2) + len("return plagiarismResult;\n}")
plag_func = old_content[start2:end2]

if plag_func and "runPlagiarismCheckImpl" not in current_content:
    target2 = "/* --------------------------------- 15 ---------------------------------- */"
    current_content = current_content.replace(target2, plag_func + "\n\n" + target2)

# Extract getBackendUrl using a safer match
start1 = old_content.find("export function getBackendUrl(): string {")
end1 = old_content.find("return \"http://localhost:8000\";\n}", start1) + len("return \"http://localhost:8000\";\n}")
backend_url_func = old_content[start1:end1]

if backend_url_func and "getBackendUrl" not in current_content:
    target1 = "export type DB = SupabaseClient<Database>;"
    current_content = current_content.replace(target1, target1 + "\n\n" + backend_url_func)

with open(current_path, 'w', encoding='utf-8') as f:
    f.write(current_content)
print("Injected runPlagiarismCheckImpl and getBackendUrl")
