import os
import urllib.request
import json

# ==============================================================================
# Part 1: Download Pyodide packages wheels
# ==============================================================================
wheels_dir = os.path.join("public", "vendor", "pyodide")
os.makedirs(wheels_dir, exist_ok=True)

jsdelivr_base = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/"
jsdelivr_wheels = [
    "numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "pandas-2.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl",
    "xlrd-2.0.1-py2.py3-none-any.whl",
    "python_dateutil-2.9.0.post0-py2.py3-none-any.whl",
    "pytz-2024.1-py2.py3-none-any.whl",
    "six-1.16.0-py2.py3-none-any.whl",
    "packaging-23.2-py3-none-any.whl",
    "micropip-0.6.0-py3-none-any.whl"
]

def download_wheel(url, filename):
    filepath = os.path.join(wheels_dir, filename)
    if os.path.exists(filepath):
        print(f"Skipping wheel {filename} (already exists)")
        return
    print(f"Downloading wheel {filename} ...")
    urllib.request.urlretrieve(url, filepath)

# Download core wheels
for wheel in jsdelivr_wheels:
    download_wheel(jsdelivr_base + wheel, wheel)

# Helper to find and download PyPI wheels
def download_pypi_wheel(package_name, version):
    filepath = os.path.join(wheels_dir, f"{package_name}-{version}-py2.py3-none-any.whl")
    # Quick existence check (approximate name)
    exists = any(f.startswith(package_name) and version in f for f in os.listdir(wheels_dir))
    if exists:
        print(f"Skipping PyPI wheel {package_name}=={version} (already exists)")
        return

    url = f"https://pypi.org/pypi/{package_name}/{version}/json"
    print(f"Fetching PyPI details for {package_name}=={version} ...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
    
    wheel_url = None
    filename = None
    for file_info in data["urls"]:
        if file_info["filename"].endswith(".whl"):
            wheel_url = file_info["url"]
            filename = file_info["filename"]
            break
            
    if wheel_url and filename:
        dest = os.path.join(wheels_dir, filename)
        print(f"Downloading PyPI wheel {filename} ...")
        urllib.request.urlretrieve(wheel_url, dest)

# Download openpyxl dependencies
download_pypi_wheel("openpyxl", "3.1.5")
download_pypi_wheel("et-xmlfile", "1.1.0")

# ==============================================================================
# Part 2: Download SmolLM2 model weights
# ==============================================================================
model_dir = os.path.join("public", "vendor", "models", "smollm2-135m-instruct")
os.makedirs(model_dir, exist_ok=True)

hf_base = "https://huggingface.co/onnx-community/SmolLM2-135M-Instruct-ONNX/resolve/main/"
model_files = [
    "config.json",
    "generation_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "merges.txt",
    "vocab.json",
    "onnx/model_q4.onnx"
]

def download_model_file(url_path):
    filename = url_path.split("/")[-1]
    sub_path = "/".join(url_path.split("/")[:-1])
    if sub_path:
        os.makedirs(os.path.join(model_dir, sub_path), exist_ok=True)
        filepath = os.path.join(model_dir, sub_path, filename)
    else:
        filepath = os.path.join(model_dir, filename)

    if os.path.exists(filepath):
        print(f"Skipping model file {url_path} (already exists)")
        return
        
    url = hf_base + url_path
    print(f"Downloading model file {url_path} ...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response, open(filepath, 'wb') as out_file:
        out_file.write(response.read())

# Download all model files
for file_path in model_files:
    download_model_file(file_path)

print("All offline assets and model weights successfully configured!")
