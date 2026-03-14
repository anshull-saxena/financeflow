import os, glob

files = glob.glob('/Users/anshul/Documents/Arushi/PPT/site/public/*.html')

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    new_content = content.replace('html.light .mesh-gradient { opacity: 0.3 !important; }', '/* mesh-gradient fixed */')
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Updated opacity in {f}")
