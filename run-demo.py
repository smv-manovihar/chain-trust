import sys
import socket
import subprocess
import atexit
import ctypes
import time
from pathlib import Path

# --- Configuration ---
PORTS = [3000, 5000, 7545, 8000, 9000, 9090]
FIREWALL_RULE_NAME = "ChainTrust_Demo_Auto"

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except Exception:
        return False

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

def setup_firewall():
    if not is_admin():
        print("[!] WARNING: Not running as Admin. Firewall rules cannot be managed automatically.")
        print("[!] Please ensure ports 3000, 5000, 8000, and 9000 are open manually.")
        return False
    
    # Remove existing rule to avoid conflict
    subprocess.run(f'powershell "Remove-NetFirewallRule -DisplayName \'{FIREWALL_RULE_NAME}\' -ErrorAction SilentlyContinue"', shell=True, capture_output=True)
    
    print(f"[*] Configuring Windows Firewall: {FIREWALL_RULE_NAME}")
    ports_str = ",".join(map(str, PORTS))
    cmd = f'powershell "New-NetFirewallRule -DisplayName \'{FIREWALL_RULE_NAME}\' -Direction Inbound -LocalPort {ports_str} -Protocol TCP -Action Allow -Profile Any"'
    result = subprocess.run(cmd, shell=True, capture_output=True)
    if result.returncode != 0:
        print(f"[!] Firewall Error: {result.stderr.decode()}")
        return False
    return True

def remove_firewall():
    if is_admin():
        print(f"\n[*] Removing Windows Firewall rule: {FIREWALL_RULE_NAME}")
        cmd = f'powershell "Remove-NetFirewallRule -DisplayName \'{FIREWALL_RULE_NAME}\'"'
        subprocess.run(cmd, shell=True, capture_output=True)

def launch_services(ip):
    # Use nip.io to provide a valid TLD for Google OAuth, which blocks raw IPs
    hostname = f"{ip}.nip.io"
    print(f"[*] Launching services with hostname: {hostname} (IP: {ip})")
    root = Path(".")
    
    # --- Environment Definitions (Temporary) ---
    frontend_vars = {
        "NEXT_PUBLIC_API_URL": f"http://{hostname}:5000",
        "NEXT_PUBLIC_AGENT_API_URL": f"http://{hostname}:8000",
        "NEXT_PUBLIC_RPC_URL": f"http://{hostname}:7545",
        "NEXT_PUBLIC_IS_LOCAL": "true",
        "ALLOWED_DEV_ORIGINS": f"{ip},{hostname}",
    }
    
    backend_vars = {
        "FRONTEND_URL": f"http://{hostname}:3000",
        "S3_ENDPOINT": f"http://{hostname}:9000",
        "AI_SERVICE_URL": f"http://{hostname}:8000",
        "RPC_URL": f"http://{hostname}:7545",
        "GOOGLE_CALLBACK_URL": f"http://{hostname}:5000/api/auth/google/callback",
        "AUTO_APPROVE_USERS": "true",
    }
    
    ai_vars = {
        "FRONTEND_URL": f"http://{hostname}:3000",
        "BACKEND_URL": f"http://{hostname}:5000",
        "S3_ENDPOINT": f"http://{hostname}:9000",
    }

    def make_set_command(vars_dict):
        # Creates a string like "set KEY1=VAL1&&set KEY2=VAL2&&"
        # No spaces before && to avoid trailing spaces in variable values on Windows
        return "".join([f"set {k}={v}&&" for k, v in vars_dict.items()])

    # 1. MinIO
    minio_cmd = "minio"
    if not subprocess.run("where minio", shell=True, capture_output=True).returncode == 0:
        if (root / "minio.exe").exists():
            minio_cmd = "minio.exe"
        elif (root / "refs" / "minio.exe").exists():
            minio_cmd = "refs\\minio.exe"
    
    minio_full = f"{minio_cmd} server infra-data/minio --console-address :9090"
    subprocess.Popen(f'start cmd /k "title ChainTrust-MinIO && {minio_full}"', shell=True)
    
    # --- Print Summary for User ---
    print("\n" + "="*60)
    print("🚀 CHAINTRUST DEMO MODE ACTIVE")
    print("="*60)
    print(f"\n🌍 MAIN URL: http://{hostname}:3000")
    print(f"🤖 AI AGENT: http://{hostname}:8000")
    print(f"📦 BACKEND:  http://{hostname}:5000")
    
    print("\n" + "!"*60)
    print("📢 ACTION REQUIRED: GOOGLE OAUTH SETUP")
    print("Google blocks raw IPs. Add these to your Google Cloud Console:")
    print("!"*60)
    print("\n1. Authorized JavaScript origins:")
    print(f"http://{hostname}:3000")
    print("http://localhost:3000")
    
    print("\n2. Authorized redirect URIs:")
    print(f"http://{hostname}:5000/api/auth/google/callback")
    print("http://localhost:5000/api/auth/google/callback")
    print("="*60 + "\n")

    # 2. Backend
    set_be = make_set_command(backend_vars)
    subprocess.Popen(f'start cmd /k "title ChainTrust-Backend && cd backend && {set_be} pnpm dev"', shell=True)
    
    # 3. Frontend
    set_fe = make_set_command(frontend_vars)
    subprocess.Popen(f'start cmd /k "title ChainTrust-Frontend && cd frontend && {set_fe} pnpm dev"', shell=True)
    
    # 4. AI Service
    set_ai = make_set_command(ai_vars)
    subprocess.Popen(f'start cmd /k "title ChainTrust-AI-Service && cd ai-service && {set_ai} uv run main.py"', shell=True)

def main():
    if not is_admin():
        print("="*60)
        print("IMPORTANT: Please run this script as ADMINISTRATOR to handle Firewall.")
        print("Right-click your terminal and select 'Run as Administrator'.")
        print("="*60)
    
    ip = get_local_ip()
    print(f"\n[+] Local IP detected: {ip}")
    print("[*] Env vars will be injected into the session (NOT written to files).")
    
    setup_firewall()
    atexit.register(remove_firewall)
    
    launch_services(ip)
    
    print("\n" + "="*60)
    print(" DEMO IS LIVE! ")
    print(f" Access URL: http://{ip}.nip.io:3000 ")
    print("="*60)
    
    # Automatically open the browser
    import webbrowser
    webbrowser.open(f"http://{ip}.nip.io:3000")
    
    print("\n[NOTE] Your .env files remain UNTOUCHED.")
    print("Press Ctrl+C to cleanup firewall rules...")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down...")
        sys.exit(0)

if __name__ == "__main__":
    main()
