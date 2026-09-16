import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# 1. Fix the truncation issue on modules
# Replace:
# <div className="text-xs truncate flex items-center gap-1.5 leading-tight">
#   <span>{m.label}</span>
# with:
# <div className="text-xs flex items-center gap-1.5 leading-tight min-w-0">
#   <span className="truncate">{m.label}</span>

content = content.replace(
    '<div className="text-xs truncate flex items-center gap-1.5 leading-tight">',
    '<div className="text-xs flex items-center gap-1.5 leading-tight min-w-0">'
)
content = content.replace(
    '<span>{m.label}</span>',
    '<span className="truncate">{m.label}</span>'
)

# Replace py-0.2 with py-0.5
content = content.replace('py-0.2', 'py-0.5')

# 2. Remove (Alt+S), (Alt+7), (Alt+B) from titles
content = content.replace('Kecilkan Menu / Lebarkan Tampilan (Alt+S)', 'Kecilkan Menu / Lebarkan Tampilan')
content = content.replace('Lebarkan Menu Navigasi (Alt+S)', 'Lebarkan Menu Navigasi')
content = content.replace('Akun Pegawai & RBAC (Alt+7)', 'Akun Pegawai & RBAC')
content = content.replace('Scanner Barcode PWA (Alt+B)', 'Scanner Barcode PWA')
content = content.replace('Keyboard Shortcuts (?)', 'Keyboard Shortcuts')

# 3. Remove the Alt+7 span
content = re.sub(
    r'\{!isSidebarCollapsed && \(\s*<span className="text-\[9px\] font-mono px-1 py-0\.5 rounded opacity-70 bg-slate-100 text-slate-400 shrink-0">\s*Alt\+7\s*</span>\s*\)\}',
    '',
    content,
    flags=re.DOTALL
)

# 4. Remove the Alt+B span
content = re.sub(
    r'\{!isSidebarCollapsed && \(\s*<span className="text-\[9px\] font-mono px-1 py-0\.5 rounded bg-slate-100 text-slate-400 shrink-0">\s*Alt\+B\s*</span>\s*\)\}',
    '',
    content,
    flags=re.DOTALL
)

# 5. Remove the SEC span
content = re.sub(
    r'\{!isSidebarCollapsed && \(\s*<span className="text-\[9px\] font-mono px-1 py-0\.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">\s*SEC\s*</span>\s*\)\}',
    '',
    content,
    flags=re.DOTALL
)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
