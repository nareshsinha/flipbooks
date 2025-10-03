import os
import re

docId = '2dfc8bed-a94f-49e1-91f3-6d92d30e7480'
# 🔧 Set your folder path

#folder = r"C:/NODE/FlipBooker/public/images/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/"
folder = r"C:/NODE/FlipBooker/public/thumbnails/2dfc8bed-a94f-49e1-91f3-6d92d30e7480/"

# Regex to match filenames like page-2.png
pattern = re.compile(r'^page-(\d+)\.png$', re.IGNORECASE)

# List matching files
files = []
for f in os.listdir(folder):
    m = pattern.match(f)
    if m:
        files.append((int(m.group(1)), f))  # (number, filename)

# Sort by number in descending order to avoid overwrite
files.sort(reverse=False)

# Rename files
for num, filename in files:
    old_path = os.path.join(folder, filename)
    new_name = f"page-{num-1}.png"
    new_path = os.path.join(folder, new_name)
    os.rename(old_path, new_path)
    print(f"Renamed: {filename} -> {new_name}")

print("✅ Renaming complete.")