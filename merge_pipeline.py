import re

ours_path = "src/lib/pipeline.server.ts"
theirs_path = "scratch/edited_files_temp/pipeline.server.ts"

with open(ours_path, 'r', encoding='utf-8') as f:
    ours_content = f.read()

with open(theirs_path, 'r', encoding='utf-8') as f:
    theirs_content = f.read()

# Extract getBackendUrl
start1 = ours_content.find("export function getBackendUrl(): string {")
end1 = ours_content.find("}", start1) + 1
backend_url_func = ours_content[start1:end1]

# Extract runPlagiarismCheckImpl
start2 = ours_content.find("export async function runPlagiarismCheckImpl(db: DB, userId: string, projectId: string) {")
end2 = ours_content.find("return plagiarismResult;\n}", start2) + len("return plagiarismResult;\n}")
plag_func = ours_content[start2:end2]

# Inject backend_url_func into theirs after `export type DB = SupabaseClient<Database>;`
if backend_url_func and "getBackendUrl" not in theirs_content:
    target = "export type DB = SupabaseClient<Database>;"
    theirs_content = theirs_content.replace(target, target + "\n\n" + backend_url_func)

# Append plag_func before `/* --------------------------------- 15 ---------------------------------- */`
if plag_func and "runPlagiarismCheckImpl" not in theirs_content:
    target2 = "/* --------------------------------- 15 ---------------------------------- */"
    theirs_content = theirs_content.replace(target2, plag_func + "\n\n" + target2)

with open(ours_path, 'w', encoding='utf-8') as f:
    f.write(theirs_content)

print("Merged pipeline.server.ts")
