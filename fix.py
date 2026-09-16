import re

with open('src/components/layout/Sidebar.tsx', 'r') as f:
    content = f.read()

# Fix 1: Top Header & Collapse/Expand Toggle
content = re.sub(
    r'<div className="shrink-0 px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">.*?(?=\<div className="w-full flex justify-center">)',
    '''<div className="shrink-0 px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
          {!isSidebarCollapsed ? (
            <>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">
                Menu Navigasi
              </span>
              <button
                id="sidebar-collapse-btn"
                onClick={() => appStore.toggleSidebar()}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Kecilkan Menu / Lebarkan Tampilan (Alt+S)"
                aria-label="Kecilkan Menu"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          ) : (
            ''',
    content,
    flags=re.DOTALL
)

# Fix 2: Bottom Section: Active User Context & Logout
content = re.sub(
    r'<div className="shrink-0 p-2.5 border-t border-slate-200 bg-slate-50/70 space-y-1.5">.*?(?=\<div className="flex flex-col items-center gap-1.5">)',
    '''<div className="shrink-0 p-2.5 border-t border-slate-200 bg-slate-50/70 space-y-1.5">
          {!isSidebarCollapsed ? (
            <>
              <div
                title={`${currentUser.name} (${currentUser.role} - L${currentUser.tier})`}
                className="w-full text-left rounded-xl flex items-center gap-2.5 p-2"
              >
                <div className="relative">
                  <img src={currentUser.avatar} alt="User Avatar" className="w-8 h-8 rounded-lg object-cover ring-2 ring-white shadow-sm" />
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">{currentUser.department}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200/60">
                <button
                  onClick={() => appStore.logout()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
                <button
                  onClick={() => appStore.setKeyboardShortcutsOpen(true)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Keyboard Shortcuts (?)"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            ''',
    content,
    flags=re.DOTALL
)

# Fix 3: Module loop badges
content = re.sub(
    r'</div>\s*\{isSidebarCollapsed && m\.badge && \(\s*<span className="absolute top-1\.5 right-1\.5 w-2\.5 h-2\.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />\s*\)\}\s*/\* Collapsed dot badge for alerts \*/\s*m\.badge && \(\s*<span className="absolute top-1\.5 right-1\.5 w-2\.5 h-2\.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />\s*\)\s*\)\}\s*</button>',
    '''</div>
                    {isSidebarCollapsed && m.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                    )}
                  </button>''',
    content,
    flags=re.DOTALL
)

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(content)
