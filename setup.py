import os
import shutil
import subprocess
import sys
import webbrowser
import re
from pathlib import Path


def print_cyan(text):
    print(f"\033[96m{text}\033[0m")


def print_green(text):
    print(f"\033[92m{text}\033[0m")


def print_yellow(text):
    print(f"\033[93m{text}\033[0m")


def print_red(text):
    print(f"\033[91m{text}\033[0m")


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def header(success_msg=None):
    clear_screen()
    print_cyan("========================================")
    print_cyan("      ChainTrust Setup Assistant      ")
    print_cyan("========================================")
    if success_msg:
        print_green(f"SUCCESS: {success_msg}")
        print_cyan("----------------------------------------")


def confirm(prompt="Proceed? [Y/n]: ", default_yes=True):
    ans = input(f"\033[95m{prompt} (Enter for Yes): \033[0m").strip().lower()
    if ans == "":
        return default_yes
    return ans == "y"


def check_command(cmd):
    return shutil.which(cmd) is not None


def run_command(cmd, cwd=None, shell=False):
    try:
        subprocess.run(cmd, cwd=cwd, shell=shell, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print_red(f"Error running command: {e}")
        return False


def load_existing_secrets(file_path):
    secrets = {}
    if not file_path.exists():
        return secrets

    with open(file_path, "r") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.split("=", 1)
                secrets[key.strip()] = val.strip()
    return secrets


def setup_env():
    header("Prerequisites verified.")
    print_cyan("\n--- Setting up Environment Variables ---")
    root = Path(".")

    placeholders = [
        "chain_trust_secret",
        "your_openrouter_api_key",
        "your_google_client_id",
        "your_google_client_secret",
        "your_private_key_here",
    ]

    while True:
        # 1. Load Existing Secrets
        existing = load_existing_secrets(root / ".env")
        # Merge with others if needed (e.g. backend/.env)
        existing.update(load_existing_secrets(root / "backend" / ".env"))

        def get_secret(key, prompt, default=None):
            if key in existing and existing[key] not in placeholders:
                existing_val = existing[key]
                display_val = f"{existing_val[:10]}..." if len(existing_val) > 10 else existing_val
                print_cyan(f"[?] Found existing {key}: {display_val}")
                if confirm("    Use this? [Y/n]: ", default_yes=True):
                    return existing_val
            
            val = input(f"{prompt} (default: {default}, Enter to use default/skip): ").strip() if default else input(f"{prompt}: ").strip()
            return val or default

        secrets = {}
        print_yellow(
            "Please confirm or enter the following secrets:"
        )

        secrets["JWT_SECRET"] = get_secret(
            "JWT_SECRET", "Enter JWT_SECRET", "chain_trust_secret"
        )

        print_cyan("\n--- AI Configuration (OpenRouter) ---")
        or_key = existing.get("OPENROUTER_API_KEY")
        use_existing_or = False
        if or_key and or_key not in placeholders:
            display_val = f"{or_key[:10]}..."
            print_cyan(f"[?] Found existing OPENROUTER_API_KEY: {display_val}")
            if confirm("    Use this? [Y/n]: ", default_yes=True):
                use_existing_or = True
        
        if not use_existing_or:
            while True:
                print_yellow("Tip: Your key should start with 'sk-or-v1-'.")
                print(
                    "Type 'open' to visit OpenRouter and generate a key, or enter your key directly."
                )
                or_input = input("Enter OPENROUTER_API_KEY (or 'open' / Enter to skip): ").strip()

                if or_input.lower() == "open":
                    webbrowser.open("https://openrouter.ai/settings/keys")
                    continue

                if not or_input:
                    print_red("No OpenRouter key provided. AI features will be disabled.")
                    or_key = "your_openrouter_api_key"
                    break

                if or_input.startswith("sk-or-v1-"):
                    or_key = or_input
                    print_green("[✓] Valid OpenRouter key format.")
                    break
                else:
                    print_red("Invalid key format (must start with 'sk-or-v1-').")
                    if confirm("Use this key anyway? [Y/n]: "):
                        or_key = or_input
                        break
        secrets["OPENROUTER_API_KEY"] = or_key

        print_cyan("\n--- Google OAuth (Optional) ---")
        secrets["GOOGLE_CLIENT_ID"] = get_secret(
            "GOOGLE_CLIENT_ID", "Enter GOOGLE_CLIENT_ID", "your_google_client_id"
        )
        secrets["GOOGLE_CLIENT_SECRET"] = get_secret(
            "GOOGLE_CLIENT_SECRET",
            "Enter GOOGLE_CLIENT_SECRET",
            "your_google_client_secret",
        )

        print_cyan("\n--- SMTP Configuration (REQUIRED) ---")
        smtp_keys = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"]
        use_existing_smtp = False
        if all(k in existing and existing[k] for k in smtp_keys):
             print_cyan("[?] Found existing SMTP configuration.")
             if confirm("    Use this? [Y/n]: ", default_yes=True):
                 use_existing_smtp = True
                 for k in smtp_keys:
                     secrets[k] = existing[k]
        
        if not use_existing_smtp:
            print_yellow("\nSMTP is required for email verification and security alerts.")
            if not confirm("Do you already have SMTP credentials (e.g., from Brevo)? [Y/n]: "):
                print_cyan("\nWe recommend using Brevo as it provides a free SMTP relay.")
                if confirm("Open Brevo signup page? [Y/n]: "):
                    webbrowser.open("https://www.brevo.com/")
                    print_cyan("\nInstructions:")
                    print("1. Create an account on Brevo.")
                    print("2. Navigate to 'SMTP & API' in the left sidebar: https://app.brevo.com/settings/keys/smtp")
                    print("3. In the 'SMTP & API' section, click 'Generate a new SMTP key'.")
                    print("4. This key is your EMAIL_PASS. Your EMAIL_USER is your Brevo login email.")
                    print("5. Important: Use your registered email (Gmail/Outlook) as the sender.")
                    input("\nPress Enter once you have your credentials ready...")

            while True:
                secrets["EMAIL_HOST"] = input(
                    "Enter EMAIL_HOST (e.g. smtp-relay.brevo.com): "
                ).strip()
                secrets["EMAIL_PORT"] = input("Enter EMAIL_PORT (e.g. 587): ").strip()
                secrets["EMAIL_USER"] = input(
                    "Enter EMAIL_USER (e.g. your@email.com): "
                ).strip()
                secrets["EMAIL_PASS"] = input("Enter EMAIL_PASS (App Password/SMTP Key): ").strip()
                if (
                    secrets["EMAIL_HOST"]
                    and secrets["EMAIL_PORT"]
                    and secrets["EMAIL_USER"]
                    and secrets["EMAIL_PASS"]
                ):
                    break
                print_red(
                    "SMTP configuration is required. Please provide Host, Port, Email, and Password."
                )

        secrets["PRIVATE_KEY"] = existing.get("PRIVATE_KEY") or "your_private_key_here"

        print_cyan("\n--- Summary of Secrets ---")
        for k, v in secrets.items():
            display_v = f"{v[:10]}..." if len(v) > 10 else v
            print(f"  {k}: {display_v}")
        
        if confirm("\nAre these correct? [Y/n]: "):
            break

    # Mapping for Frontend/AI Service
    frontend_secrets = {"NEXT_PUBLIC_GOOGLE_CLIENT_ID": secrets["GOOGLE_CLIENT_ID"]}
    ai_secrets = {
        "JWT_SECRET": secrets["JWT_SECRET"],
        "OPENROUTER_API_KEY": secrets["OPENROUTER_API_KEY"],
    }

    # 2. Create and Update Files
    # Root
    if (root / ".env.example").exists() and not (root / ".env").exists():
        shutil.copy(".env.example", ".env")
    
    update_env_file(root / ".env", secrets)

    # Backend
    if (root / "backend" / ".env.example").exists() and not (root / "backend" / ".env").exists():
        shutil.copy("backend/.env.example", "backend/.env")
    
    update_env_file(root / "backend" / ".env", secrets)

    # Frontend
    if (root / "frontend" / ".env.example").exists() and not (root / "frontend" / ".env").exists():
        shutil.copy("frontend/.env.example", "frontend/.env")
    
    update_env_file(root / "frontend" / ".env", frontend_secrets)

    # AI Service
    ai_env = root / "ai-service" / ".env"
    if not ai_env.exists():
        with open(ai_env, "w") as f:
            f.write(f"JWT_SECRET = {ai_secrets['JWT_SECRET']}\n")
            f.write(f"OPENROUTER_API_KEY = {ai_secrets['OPENROUTER_API_KEY']}\n")
            f.write("MONGO_URI = mongodb://localhost:27017\n")
    else:
        update_env_file(ai_env, ai_secrets)

    print_green("\nAll environment files configured successfully.")
    input("\nPress Enter to continue...")


def update_env_file(file_path, secrets):
    if not file_path.exists():
        return

    with open(file_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        updated = False
        for key, value in secrets.items():
            if re.match(rf"^{key}\s*=", line):
                new_lines.append(f"{key} = {value}\n")
                updated = True
                break
        if not updated:
            new_lines.append(line)

    with open(file_path, "w") as f:
        f.writelines(new_lines)


def handle_prerequisites():
    header()
    print_cyan("\n--- Managing Prerequisites ---")

    # 1. Handle Node.js
    if check_command("node"):
        print_green("[✓] Node.js is already installed.")
    else:
        print_red("[✗] Node.js is missing.")
        if confirm("Open Node.js download page? [Y/n]: "):
            webbrowser.open("https://nodejs.org/")
            while True:
                if confirm("Have you finished installing Node.js? [Y/n]: "):
                    if check_command("node"):
                        print_green("[✓] Node.js verified.")
                        break
                    else:
                        print_yellow(
                            "Could not find 'node' in PATH. Try checking again?"
                        )
                        if confirm("Check again? [Y/n]: "):
                            pass # Loop continues
                        else:
                            break # Exit loop if user doesn't want to check again

    # 2. Handle pnpm via npm
    if check_command("pnpm"):
        print_green("[✓] pnpm is already installed.")
    else:
        print_red("[✗] pnpm is missing.")
        if confirm("Install pnpm via 'npm install -g pnpm'? [Y/n]: "):
            if run_command(["npm", "install", "-g", "pnpm"], shell=True):
                print_green("[✓] pnpm installed via npm.")
            else:
                print_red("Failed to install pnpm via npm.")
                webbrowser.open("https://pnpm.io/installation")
                input("Press Enter once you have installed pnpm manually...")

    # 3. Handle uv via pip
    if check_command("uv"):
        print_green("[✓] uv is already installed.")
    else:
        print_red("[✗] uv is missing.")
        if confirm("Install uv via 'pip install uv'? [Y/n]: "):
            if run_command([sys.executable, "-m", "pip", "install", "uv"]):
                print_green("[✓] uv installed via pip.")
            else:
                print_red("Failed to install uv via pip.")
                webbrowser.open(
                    "https://docs.astral.sh/uv/getting-started/installation/"
                )
                input("Press Enter once you have installed uv manually...")

    # 4. Handle MinIO
    root = Path(".")
    is_minio_installed = (
        check_command("minio")
        or (root / "minio.exe").exists()
        or (root / "refs" / "minio.exe").exists()
    )
    if is_minio_installed:
        print_green("[✓] MinIO is already installed/available.")
    else:
        print_red("[✗] MinIO is missing.")
        if confirm("Open MinIO download page (Windows binary)? [Y/n]: "):
            webbrowser.open(
                "https://dl.min.io/server/minio/release/windows-amd64/minio.exe"
            )
            print_yellow(
                "Note: Download 'minio.exe' and place it in your PATH or the project root."
            )
            while True:
                if confirm("Have you finished setting up MinIO? [Y/n]: "):
                    if (
                        check_command("minio")
                        or (root / "minio.exe").exists()
                        or (root / "refs" / "minio.exe").exists()
                    ):
                        print_green("[✓] MinIO verified.")
                        break
                    else:
                        print_yellow(
                            "Could not find 'minio' in PATH, root, or /refs. Try checking again?"
                        )
                        if not confirm("Check again? [Y/n]: "):
                            break

    # 5. Handle Ganache UI
    def check_ganache_ui():
        # Soft checks for common paths
        paths = [
            Path(os.environ.get("LOCALAPPDATA", ""))
            / "Programs"
            / "Ganache"
            / "Ganache.exe",
            Path("C:/Program Files/Ganache/Ganache.exe"),
        ]
        if any(p.exists() for p in paths):
            return True

        # Check for Windows App (AppX) via PowerShell
        try:
            # This doesn't require admin privileges for the user's own packages
            cmd = "Get-AppxPackage -Name '*Ganache*' | Select-Object -ExpandProperty InstallLocation"
            result = subprocess.run(
                ["powershell", "-Command", cmd],
                capture_output=True,
                text=True,
                check=False,
            )
            install_loc = result.stdout.strip()
            if install_loc:
                exe_path = Path(install_loc) / "app" / "Ganache.exe"
                if exe_path.exists():
                    return True
                # Sometimes it might be directly in the root
                if (Path(install_loc) / "Ganache.exe").exists():
                    return True
        except Exception:
            pass

        return False

    if check_ganache_ui():
        print_green("[✓] Ganache UI detected.")
    else:
        print_red("[✗] Ganache UI NOT detected.")
        # Only suggest download, don't force a blocking confirmation for now
        print_yellow(
            "Tip: If you've installed it via the Microsoft Store, it might be in a restricted path."
        )
        if confirm("Open Ganache download page? [Y/n]: "):
            webbrowser.open("https://trufflesuite.com/ganache/")

    # 6. Handle MongoDB
    def check_mongodb():
        # 1. Try global path
        if check_command("mongod"):
            try:
                res = subprocess.run(["mongod", "--version"], capture_output=True, text=True, check=False)
                match = re.search(r"db version v(\d+)\.", res.stdout)
                if match:
                    ver = int(match.group(1))
                    return True, ver, "mongod"
            except Exception:
                return True, None, "mongod"
        
        # 2. Try dynamic path scanning on Windows
        base_path = Path("C:/Program Files/MongoDB/Server")
        if base_path.exists():
            try:
                # List versioned folders like 6.0, 7.0, 8.0 etc.
                version_dirs = [d for d in base_path.iterdir() if d.is_dir()]
                for v_dir in sorted(version_dirs, key=lambda x: x.name, reverse=True):
                    exe = v_dir / "bin" / "mongod.exe"
                    if exe.exists():
                        try:
                            res = subprocess.run([str(exe), "--version"], capture_output=True, text=True, check=False)
                            match = re.search(r"db version v(\d+)\.", res.stdout)
                            if match:
                                return True, int(match.group(1)), str(exe)
                        except Exception:
                            return True, None, str(exe)
            except Exception:
                pass
        return False, None, None

    is_mongo, mongo_ver, mongo_path = check_mongodb()
    if is_mongo:
        if mongo_ver and mongo_ver < 8:
            print_yellow(f"[!] MongoDB {mongo_ver}.x detected.")
            print_red("URGENT: This project requires MongoDB 8.0 or higher for full compatibility.")
            if confirm("Open MongoDB download page to upgrade? [Y/n]: "):
                webbrowser.open("https://www.mongodb.com/try/download/community")
                input("\nPress Enter once you have upgraded MongoDB...")
        else:
            ver_str = f" v{mongo_ver}.x" if mongo_ver else ""
            print_green(f"[✓] MongoDB{ver_str} (mongod) is already installed.")
    else:
        print_red("[✗] MongoDB (mongod) is missing.")
        if confirm("Open MongoDB download page? [Y/n]: "):
            webbrowser.open("https://www.mongodb.com/try/download/community")
            while True:
                if confirm("Have you finished installing MongoDB? [Y/n]: "):
                    is_mongo, mongo_ver, mongo_path = check_mongodb()
                    if is_mongo:
                        print_green("[✓] MongoDB verified.")
                        break
                    else:
                        print_yellow("Could not find 'mongod'. Try checking again?")
                        if not confirm("Check again? [Y/n]: "):
                            break
    
    # Store for final instructions
    globals()["MONGO_CMD"] = mongo_path or "mongod"

    if confirm("\nWould you like to install MongoDB Compass (GUI)? [Y/n]: "):
        webbrowser.open("https://www.mongodb.com/try/download/compass")
        print_green("Opened MongoDB Compass download page.")

    print_green("\nPrerequisites verified.")
    input("\nPress Enter to continue to environment setup...")


def setup_metamask_tutorial():
    header("MetaMask & Account Onboarding")
    print_cyan("\n--- Phase 1: MetaMask Installation ---")
    print_yellow(
        "MetaMask is required to interact with the blockchain in your browser."
    )
    if confirm("Open MetaMask Chrome Web Store link? [Y/n]: "):
        webbrowser.open(
            "https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn"
        )

    while True:
        if confirm("Is MetaMask installed and a password set? [Y/n]: "):
            break

    print_cyan("\n--- Phase 2: Importing Ganache Wallet ---")
    print_yellow("Follow these steps to link your local blockchain to MetaMask:")
    print_yellow(
        "1. In MetaMask, click the Network selector (top-left) -> 'Add Network'."
    )
    print_yellow("2. Click 'Add a network manually'.")
    print_yellow("3. Enter these details:")
    print("   - Network Name: ChainTrust Dev")
    print("   - RPC URL: http://127.0.0.1:7545")
    print("   - Chain ID: 1337")
    print("   - Currency Symbol: ETH")
    while True:
        if confirm("Have you added the 'ChainTrust Dev' network? [Y/n]: "):
            break

    print_yellow("\n4. In MetaMask, click the Account icon -> 'Import Account'.")
    print_yellow("5. Paste a DIFFERENT Ganache Private Key (e.g., Index 1 or later).")
    print_yellow("   IMPORTANT: Account 0 is used by the system as the Service Provider (ChainTrust).")
    print_yellow("   To mimic a 'Manufacturer' or 'User', you MUST use a different account.")
    print_yellow(
        "   (You can find these in Ganache UI under the 'keys' icon for each account)."
    )
    print_cyan("\n[!] WHY DIFFERENT?")
    print_yellow("   The smart contract handles transactions between the Manufacturer (You) and")
    print_yellow("   ChainTrust (Service Provider). Using Account 1+ makes testing realistic.")
    while True:
        if confirm("Have you successfully imported a DIFFERENT account (Index 1+)? [Y/n]: "):
            break

    print_green("\nWallet & Account setup complete!")

def launch_terminals():
    header("Launching Services")
    print_cyan("\n--- Starting Automatic Terminals ---")
    
    # 1. MinIO
    root = Path(".")
    minio_cmd = "minio" if check_command("minio") else "minio.exe"
    if not check_command("minio") and not (root / "minio.exe").exists() and (root / "refs" / "minio.exe").exists():
        minio_cmd = "./refs/minio.exe"
    elif not check_command("minio") and (root / "minio.exe").exists():
        minio_cmd = "./minio.exe"

    minio_full_cmd = f"{minio_cmd} server ./infra-data/minio --console-address :9090"
    print_yellow("Starting MinIO...")
    subprocess.Popen(f'start cmd /k "title ChainTrust-MinIO && {minio_full_cmd}"', shell=True)

    # 2. Backend
    print_yellow("Starting Backend...")
    subprocess.Popen('start cmd /k "title ChainTrust-Backend && cd backend && pnpm dev"', shell=True)

    # 3. Frontend
    print_yellow("Starting Frontend...")
    subprocess.Popen('start cmd /k "title ChainTrust-Frontend && cd frontend && pnpm dev"', shell=True)

    # 4. AI Service
    print_yellow("Starting AI-Service...")
    subprocess.Popen('start cmd /k "title ChainTrust-AI-Service && cd ai-service && uv run main.py"', shell=True)
    
    print_green("\n[✓] All service terminals have been launched.")
    print_cyan("\nWait a few seconds for the services to initialize.")
    print_yellow("Then, visit http://localhost:3000 to register/sign in.")


def main():
    handle_prerequisites()

    # Automatically proceed to environment setup
    setup_env()

    header("Environment files configured successfully.")
    print_cyan("\n--- Project Dependency Installation ---")
    
    # Backend dependencies
    while True:
        print_yellow("Installing Backend dependencies (pnpm)...")
        if run_command(["pnpm", "install"], cwd="backend", shell=True):
            print_green("Backend dependencies installed.")
            break
        else:
            if not confirm("Backend installation failed. Retry? [Y/n] (Enter to retry): "):
                break

    header("Backend dependencies handled.")
    print_cyan("\n--- Smart Contract Deployment (REQUIRED) ---")
    print_yellow(
        "This step will automatically populate blockchain secrets in your .env files."
    )
    print_yellow("Ensure Ganache UI is running with a 'New Workspace' on port 7545.")
    print_yellow("Project Settings (Ganache): Network ID: 1337, Account Balance: 100.")
    print_red("IMPORTANT: Keep Ganache running! Do not close it during development.")

    import socket

    def is_ganache_running(port=7545):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(("localhost", port)) == 0

    deployed = False
    while True:
        if is_ganache_running():
            print_green("[✓] Ganache detected on port 7545.")
            if confirm("Deploy the Smart Contract to Ganache now? [Y/n]: "):
                # --- Logical Key Collection ---
                while True:
                    print_cyan("\n--- Deployment Configuration ---")

                    # Check for existing key
                    existing_secrets = load_existing_secrets(Path(".env"))
                    existing_secrets.update(load_existing_secrets(Path("backend/.env")))
                    existing_key = existing_secrets.get("PRIVATE_KEY")
                    if existing_key == "your_private_key_here":
                        existing_key = ""

                    p_key = ""
                    if existing_key:
                        print_green(
                            f"[i] Found existing Private Key in .env: {existing_key[:6]}...{existing_key[-4:]}"
                        )
                        if confirm("Use this existing key for deployment? [Y/n]: "):
                            p_key = existing_key

                    if not p_key:
                        print_yellow("To deploy, we need a Ganache Private Key (Index 0).")
                        print_yellow(
                            "In Ganache UI: Click the 'keys' icon on the first account."
                        )
                        while True:
                            pk_input = input("Enter GANACHE_PRIVATE_KEY: ").strip()
                            if not pk_input:
                                print_red("Private key is required.")
                                continue
                            clean_pk = (
                                pk_input[2:] if pk_input.startswith("0x") else pk_input
                            )
                            if re.match(r"^[0-9a-fA-F]{64}$", clean_pk):
                                p_key = (
                                    pk_input if pk_input.startswith("0x") else f"0x{pk_input}"
                                )
                                break
                            else:
                                print_red("Invalid format. Should be 64-character hex.")
                                if confirm("Use anyway? [Y/n]: "):
                                    p_key = pk_input
                                    break
                    
                    if p_key:
                        print_green(f"Selected Key: {p_key[:6]}...{p_key[-4:]}")
                        if confirm("Proceed with this key? [Y/n]: "):
                            break
                
                if p_key:
                    update_env_file(Path(".env"), {"PRIVATE_KEY": p_key})
                    update_env_file(Path("backend/.env"), {"PRIVATE_KEY": p_key})

                # Run deployment
                while True:
                    if run_command(
                        ["node", "scripts/deploy.js"], cwd="backend", shell=True
                    ):
                        print_green(
                            "Smart Contract deployed and blockchain secrets populated."
                        )
                        deployed = True
                        break
                    else:
                        print_red("Deployment failed. Please check the Ganache logs.")
                        if not confirm("Retry deployment? [Y/n] (Enter to retry): "):
                            break
                if deployed or not confirm("Retry entire deployment step? [Y/n]: "):
                    break
        else:
            print_red("[✗] Ganache NOT detected on port 7545.")
            print_yellow("Please start Ganache UI and create/open your workspace.")
            if not confirm("Check again? [Y/n]: "):
                break
    input("\nPress Enter to continue...")

    header("Smart Contract deployment handled.")
    print_cyan("\n--- Frontend & AI Service Setup ---")
    
    # Frontend dependencies
    while True:
        print_yellow("Installing Frontend dependencies (pnpm)...")
        if run_command(["pnpm", "install"], cwd="frontend", shell=True):
            print_green("Frontend dependencies installed.")
            break
        else:
            if not confirm("Frontend installation failed. Retry? [Y/n] (Enter to retry): "):
                break

    # AI Service dependencies
    while True:
        print_yellow("\nSetting up AI Service dependencies (uv)...")
        if run_command(["uv", "sync"], cwd="ai-service", shell=True):
            print_green("AI Service dependencies installed.")
            break
        else:
            if not confirm("AI Service setup failed. Retry? [Y/n] (Enter to retry): "):
                break

    # Ensure infra directories exist
    root = Path(".")
    (root / "infra-data" / "minio").mkdir(parents=True, exist_ok=True)
    (root / "infra-data" / "mongodb").mkdir(parents=True, exist_ok=True)

    header("Environment & Dependencies Ready")
    
    # Run MetaMask tutorial BEFORE starting services as requested
    setup_metamask_tutorial()

    # Automate terminal launching
    launch_terminals()

    print_green("\nReady to build the future of trust!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_yellow("\nSetup cancelled.")
        sys.exit(0)
