import { useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    {
      path: '/',
      icon: 'fas fa-tachometer-alt',
      label: '대시보드',
    },
    {
      path: '/library',
      icon: 'fas fa-folder',
      label: '내 자료실',
    },

    {
      path: '/student-management',
      icon: 'fas fa-users',
      label: '학생 관리',
    },
    {
      path: '/classroom-sync',
      icon: 'fas fa-school',
      label: 'Classroom 동기화',
    },
    {
      path: '/shared',
      icon: 'fas fa-share-alt',
      label: '공유 콘텐츠',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200 overflow-y-auto">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                className={`flex items-center px-4 py-2 rounded-lg korean-text ${
                  isActive(item.path)
                    ? 'text-gray-700 bg-primary/10 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <i className={`${item.icon} mr-3 ${isActive(item.path) ? 'text-primary' : 'text-gray-500'}`}></i>
                <span>{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
