import os
import re
import subprocess

def get_commit_hash():
    try:
        return subprocess.check_output(['git', 'rev-parse', 'HEAD']).decode('utf-8').strip()
    except Exception:
        return "main"

def analyze_todos():
    repo_url = "https://github.com/n24q02m/better-godot-mcp"
    commit_hash = get_commit_hash()

    todos = []

    # We split the pattern string to avoid the script finding itself
    keywords = ['TO' + 'DO', 'FIX' + 'ME', 'BU' + 'G', 'HA' + 'CK', 'X' + 'XX']
    pattern = re.compile(r'(' + '|'.join(keywords) + r')[:\s]+(.*)', re.IGNORECASE)

    for root, dirs, files in os.walk('.'):
        # Skip common directories to ignore
        if any(ex in root for ex in ['node_modules', '.git', 'build', 'dist', 'target', '.venv', 'venv']):
            continue

        for file in files:
            # Focus on common source file extensions
            if not file.endswith(('.ts', '.js', '.py', '.java', '.md', '.gd', '.gdshader')):
                continue

            filepath = os.path.join(root, file)
            # Standardize path for URL generation
            rel_path = os.path.relpath(filepath, '.')

            # Avoid self-reference
            if rel_path == 'generate_todos.py':
                continue

            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        match = pattern.search(line)
                        if match:
                            tag = match.group(1).upper()
                            message = match.group(2).strip()
                            github_url = f"{repo_url}/blob/{commit_hash}/{rel_path}#L{i}"
                            todos.append({
                                'file': rel_path,
                                'line': i,
                                'tag': tag,
                                'message': message,
                                'url': github_url
                            })
            except (UnicodeDecodeError, PermissionError):
                continue

    return todos

if __name__ == "__main__":
    found_todos = analyze_todos()
    if not found_todos:
        print("No items found.")
    else:
        print(f"Found {len(found_todos)} items:\n")
        for item in found_todos:
            print(f"[{item['tag']}] {item['file']}:{item['line']}")
            print(f"  Message: {item['message']}")
            print(f"  Link: {item['url']}\n")
