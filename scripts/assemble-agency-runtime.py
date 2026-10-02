#!/usr/bin/env python3
"""Assemble a prebuilt Next standalone runtime without embedding private env."""
import argparse, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('destination',type=Path)
 args=parser.parse_args();stage=args.destination
 if stage.exists():raise SystemExit('Destination already exists; use a fresh staging directory.')
 shutil.copytree(ROOT/'apps/admin/.next/standalone',stage,symlinks=True)
 shutil.copytree(ROOT/'apps/admin/.next/static',stage/'apps/admin/.next/static',dirs_exist_ok=True)
 shutil.copytree(ROOT/'apps/admin/public',stage/'apps/admin/public',dirs_exist_ok=True)
 shutil.copy2(ROOT/'Dockerfile.agency-runtime',stage/'Dockerfile')
 helpers=next((ROOT/'node_modules/.pnpm').glob('@swc+helpers*/node_modules/@swc/helpers'))
 shutil.copytree(helpers,stage/str(helpers.relative_to(ROOT)),dirs_exist_ok=True)
 tokenizer=next((ROOT/'node_modules/.pnpm').glob('js-tiktoken*/node_modules/js-tiktoken'))
 for source in [tokenizer,tokenizer.parent/'base64-js']:
  shutil.copytree(source,stage/'node_modules'/source.name,dirs_exist_ok=True)
 if list(stage.rglob('.env')):raise SystemExit('Private env found in image context.')
 envfile=ROOT/'.env'
 env=dict(line.split('=',1) for line in envfile.read_text().splitlines() if '=' in line and not line.startswith('#')) if envfile.exists() else {}
 values=[value.encode() for key,value in env.items() if len(value)>=20 and any(part in key for part in ['SECRET','PASSWORD','TOKEN','KEY','DATABASE_URL'])]
 for path in stage.rglob('*'):
  if path.is_file() and not path.is_symlink():
   data=path.read_bytes()
   if any(value in data for value in values):raise SystemExit('Private configuration embedded in image context.')
 print('RUNTIME_CONTEXT_READY_SECRET_AUDIT_ZERO_MATCHES')
if __name__=='__main__':main()
