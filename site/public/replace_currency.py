import os, glob, re

files = glob.glob('/Users/anshul/Documents/Arushi/PPT/site/public/*.html')

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Replace $ with ₹ ONLY if it is not followed by { (to avoid breaking ${} template literals)
    # This safely converts things like '$' + balance to '₹' + balance
    # and $${var} to ₹${var}
    new_content = re.sub(r'\$(?!\{)', '₹', content)
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Updated {f}")
