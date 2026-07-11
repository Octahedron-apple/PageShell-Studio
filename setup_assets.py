import os
import urllib.request
import json

# ==============================================================================
# Download Pyodide offline package wheels
#
# These are small files (~50MB total) served from jsDelivr (fast, reliable CDN).
# The AI model weights are NOT downloaded here — they are fetched at runtime
# by the browser via Transformers.js and cached in IndexedDB on first use.
# This keeps CI fast and avoids HuggingFace rate-limit failures in GitHub Actions.
# ==============================================================================
wheels_dir = os.path.join("public", "vendor", "pyodide")
os.makedirs(wheels_dir, exist_ok=True)

jsdelivr_base = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
jsdelivr_wheels = [
    # C-extension dependencies like numpy and pandas are loaded dynamically 
    # via pyodide.loadPackage() so they link correctly.
]

def download_wheel(url, filename):
    filepath = os.path.join(wheels_dir, filename)
    if os.path.exists(filepath):
        print(f"  [skip] {filename} (already exists)")
        return
    print(f"  [download] {filename} ...")
    urllib.request.urlretrieve(url, filepath)
    print(f"  [ok] {filename}")

print("==> Downloading Pyodide wheels from jsDelivr ...")
for wheel in jsdelivr_wheels:
    download_wheel(jsdelivr_base + wheel, wheel)

# Helper to find and download PyPI wheels (openpyxl + et-xmlfile)
def download_pypi_wheel(package_name, version):
    exists = any(f.lower().startswith(package_name.lower().replace("-", "_")) and version in f
                 for f in os.listdir(wheels_dir))
    if exists:
        print(f"  [skip] {package_name}=={version} (already exists)")
        return

    url = f"https://pypi.org/pypi/{package_name}/{version}/json"
    print(f"  [fetch] PyPI metadata for {package_name}=={version} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())

    for file_info in data["urls"]:
        if file_info["filename"].endswith(".whl"):
            dest = os.path.join(wheels_dir, file_info["filename"])
            print(f"  [download] {file_info['filename']} ...")
            urllib.request.urlretrieve(file_info["url"], dest)
            print(f"  [ok] {file_info['filename']}")
            return

print("==> Downloading PyPI wheels ...")
download_pypi_wheel("openpyxl", "3.1.5")
download_pypi_wheel("et-xmlfile", "1.1.0")

print("\nAll offline assets configured successfully!")
print("Note: AI model weights are fetched by the browser on first use (cached in IndexedDB).")
