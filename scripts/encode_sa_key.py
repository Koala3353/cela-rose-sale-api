#!/usr/bin/env python3
"""
Encode a Google service account JSON into a single-line base64 value and
safely insert/update the GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 line in a .env file.

Usage:
  python3 scripts/encode_sa_key.py /path/to/key.json
  python3 scripts/encode_sa_key.py /path/to/key.json --env .env --print-secret --copy

Options:
  --env PATH       Path to .env (default: ./ .env)
  --print-secret   Print the full base64 value to stdout (BE CAREFUL)
  --copy           Copy the base64 value to clipboard (macOS pbcopy)

The script will:
  - validate the JSON and extract the service account email (printed)
  - backup the existing .env to .env.bak
  - replace any existing GOOGLE_SERVICE_ACCOUNT_KEY_BASE64= line
  - append the new GOOGLE_SERVICE_ACCOUNT_KEY_BASE64=<base64> line

This helper is intended for local development. For production, prefer a secret
manager and do not store long secrets in plaintext files.
"""

import argparse
import base64
import json
import os
import shutil
import sys
import tempfile


def read_keyfile(path: str) -> bytes:
    with open(path, 'rb') as f:
        return f.read()


def parse_client_email(json_bytes: bytes) -> str:
    try:
        j = json.loads(json_bytes.decode('utf8'))
        return j.get('client_email') or j.get('clientId') or ''
    except Exception:
        return ''


def write_env(env_path: str, encoded: str) -> None:
    # Ensure we operate atomically: write to temp file then move
    tmp_fd, tmp_path = tempfile.mkstemp(dir=os.path.dirname(env_path) or '.')
    os.close(tmp_fd)

    # Read existing env if present, filtering out old key line
    lines = []
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf8') as f:
            for line in f:
                if not line.strip().startswith('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64='):
                    lines.append(line.rstrip('\n'))

    # Append the new key line
    lines.append(f'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64={encoded}')

    # Write new file
    with open(tmp_path, 'w', encoding='utf8') as f:
        for ln in lines:
            f.write(ln + "\n")

    # Backup original env
    if os.path.exists(env_path):
        shutil.copy2(env_path, env_path + '.bak')

    # Move temp to env
    shutil.move(tmp_path, env_path)


def copy_to_clipboard_mac(value: str) -> bool:
    try:
        p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
        p.communicate(input=value.encode('utf8'))
        return p.returncode == 0
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(description='Encode service account JSON and update .env')
    parser.add_argument('keyfile', help='Path to service account JSON file')
    parser.add_argument('--env', default='.env', help='Path to .env file (default: .env)')
    parser.add_argument('--print-secret', action='store_true', help='Print the full base64 value to stdout')
    parser.add_argument('--copy', action='store_true', help='Copy the base64 value to clipboard (macOS pbcopy)')

    args = parser.parse_args()

    keyfile = os.path.expanduser(args.keyfile)
    env_path = os.path.expanduser(args.env)

    if not os.path.isfile(keyfile):
        print(f'ERROR: key file not found: {keyfile}', file=sys.stderr)
        sys.exit(2)

    # Read and base64-encode
    raw = read_keyfile(keyfile)

    # Validate JSON and extract client_email
    try:
        j = json.loads(raw.decode('utf8'))
        client_email = j.get('client_email', '')
    except Exception as e:
        print('ERROR: failed to parse JSON key file:', e, file=sys.stderr)
        sys.exit(3)

    encoded = base64.b64encode(raw).decode('ascii').replace('\n', '')

    # Write to env (atomically)
    try:
        write_env(env_path, encoded)
    except Exception as e:
        print('ERROR: failed to write env file:', e, file=sys.stderr)
        sys.exit(4)

    print('SUCCESS: updated', env_path)
    if client_email:
        print('SERVICE_ACCOUNT_EMAIL=' + client_email)
    else:
        print('SERVICE_ACCOUNT_EMAIL not found in JSON')

    if args.print_secret:
        print('\n--- BEGIN SECRET (base64) ---')
        print(encoded)
        print('--- END SECRET ---\n')

    if args.copy:
        try:
            # Use macOS pbcopy if available
            import subprocess
            p = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
            p.communicate(input=encoded.encode('utf8'))
            if p.returncode == 0:
                print('Copied base64 to clipboard (pbcopy)')
            else:
                print('Failed to copy to clipboard (pbcopy returned non-zero)')
        except Exception:
            print('Failed to copy to clipboard (pbcopy error)')


if __name__ == '__main__':
    main()
