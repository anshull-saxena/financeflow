import os
import re
import shutil

src_dir = '/Users/anshul/Documents/Arushi/PPT/financeflow'
dest_dir = '/Users/anshul/Documents/Arushi/PPT/financeflow_app'

if os.path.exists(dest_dir):
    shutil.rmtree(dest_dir)
os.makedirs(dest_dir)

pages = {
    'login_page': 'index.html',
    'register_page': 'register.html',
    'dashboard': 'dashboard.html',
    'income_page': 'income.html',
    'expenses_page': 'expenses.html',
    'reports_analytics': 'reports.html',
    'settings': 'settings.html',
    'add_transaction_modal': 'add_transaction.html'
}

link_mapping = {
    'Dashboard': 'dashboard.html',
    'Income': 'income.html',
    'Expenses': 'expenses.html',
    'Analytics': 'reports.html',
    'Settings': 'settings.html',
    'Sign up for free': 'register.html',
    'Log in': 'index.html',
    'Sign In': 'index.html',
}

def process_links(html):
    # Forms: we set action to dashboard.html assuming all forms are login/register
    html = re.sub(r'<form([^>]*)>', r'<form\1 action="dashboard.html">', html)
    
    # We can also fix anchors using basic regex
    for text, link in link_mapping.items():
        # Match anchors that contain the specific text inside the tag
        # e.g. <a href="#">...Dashboard...</a> -> <a href="dashboard.html">...Dashboard...</a>
        pattern = r'<a([^>]*)href="[^"]*"([^>]*)>(.*?)' + re.escape(text) + r'(.*?)</a>'
        html = re.sub(pattern, r'<a\1href="' + link + r'"\2>\3' + text + r'\4</a>', html, flags=re.IGNORECASE | re.DOTALL)

    return html

for folder, dest_file in pages.items():
    src_file = os.path.join(src_dir, folder, 'code.html')
    if os.path.exists(src_file):
        with open(src_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        processed_content = process_links(content)
        
        with open(os.path.join(dest_dir, dest_file), 'w', encoding='utf-8') as f:
            f.write(processed_content)
        print(f"Processed {folder} -> {dest_file}")
        
    image_file = os.path.join(src_dir, folder, 'screen.png')
    if os.path.exists(image_file):
        shutil.copy2(image_file, os.path.join(dest_dir, dest_file.replace('.html', '.png')))

print("App successfully built in financeflow_app!")
