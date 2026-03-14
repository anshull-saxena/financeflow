import os, glob

files = glob.glob('/Users/anshul/Documents/Arushi/PPT/site/public/*.html')

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Let's just strip out the bad filter strings directly.
    # From earlier: filter: invert(0.9) hue-rotate(180deg); and filter: invert(1) hue-rotate(180deg); and filter: invert(1);
    
    new_content = content.replace('filter: invert(0.9) hue-rotate(180deg); ', '')
    new_content = new_content.replace('filter: invert(1) hue-rotate(180deg); ', '')
    new_content = new_content.replace('filter: invert(1); ', '')
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Updated {f}")
