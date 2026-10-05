with open(r'c:\xampp\htdocs\INVOICE-SS\logo_b64.txt') as f:
    b64 = f.read().strip()

img_tag = f'<img src="data:image/png;base64,{b64}" alt="S.S. Enterprises Logo" class="monogram-logo-img">'

for path in [r'c:\xampp\htdocs\INVOICE-SS\index.html', r'c:\xampp\htdocs\INVOICE-A1\ss-invoice.html']:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    start_tag = '<div class="header-center-branding">'
    h2_tag = '<h2 class="company-main-title" id="display-company-name">S.S. Enterprises</h2>'
    
    idx1 = content.find(start_tag)
    idx2 = content.find(h2_tag, idx1)
    
    if idx1 != -1 and idx2 != -1:
        new_content = content[:idx1 + len(start_tag)] + '\n                ' + img_tag + '\n                ' + content[idx2:]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Updated:', path)
    else:
        print('Could not find tags in:', path)
