import os

ours_path = "src/routes/_authenticated/runs.$id.tsx"
theirs_path = "scratch/edited_files_temp/runs.$id.tsx"

with open(ours_path, 'r', encoding='utf-8') as f:
    ours_content = f.read()

with open(theirs_path, 'r', encoding='utf-8') as f:
    theirs_content = f.read()

start_marker = "{/* Plagiarism Analysis Report from GoWinston AI */}"
end_marker = "})()\n              </div>\n            ) : ("

def extract_plag_block(content):
    start = content.find(start_marker)
    if start == -1: return None
    end = content.find("})()", start)
    if end == -1: return None
    end = content.find("})()", start) + 4
    return content[start:end]

ours_block = extract_plag_block(ours_content)

if ours_block:
    # Inject it into theirs_content after <Mono>{paper.content}</Mono>
    target = "<Mono>{paper.content}</Mono>"
    replacement = target + "\n\n              " + ours_block
    merged_content = theirs_content.replace(target, replacement)
    
    with open(ours_path, 'w', encoding='utf-8') as f:
        f.write(merged_content)
    print("Successfully merged Plagiarism block into the new runs.$id.tsx")
else:
    print("Could not extract plagiarism block from ours.")
