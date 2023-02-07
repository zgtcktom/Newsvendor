import glob
import shutil, os,sys

target_dir=sys.argv[1] if len(sys.argv)>1 else 'browser'



files = glob.glob('imgs/**/*', recursive=True)
files += glob.glob('src/**/*', recursive=True)
files += glob.glob('*.js')
files += glob.glob('*.css')
files += glob.glob('*.html')

files=[file for file in files if file not in ['forge.config.js','preload.js']]

shutil.rmtree(target_dir,ignore_errors=True)

for file in files:
    target_path=os.path.join(target_dir,file)
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    shutil.copyfile(file,target_path )

print(files)
shutil.make_archive(target_dir, 'zip', target_dir)
