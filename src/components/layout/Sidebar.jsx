import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, CheckSquare, FolderKanban, Settings, Users, LogOut, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import styles from './Sidebar.module.css';

const Sidebar = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Início', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Leads', path: '/leads', icon: <List size={20} /> },
    { name: 'Tarefas', path: '/tasks', icon: <CheckSquare size={20} /> },
    { name: 'Clientes', path: '/clients', icon: <Users size={20} /> },
    { name: 'Projetos', path: '/projects', icon: <FolderKanban size={20} /> },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <img src="/logo.png" alt="AQ Logo" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>WORKSPACE</div>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <NavLink 
          to="/settings"
          className={({ isActive }) =>
            isActive ? `${styles.footerItem} ${styles.active}` : styles.footerItem
          }
        >
          <Settings size={20} />
          <span>Configurações</span>
        </NavLink>
        <button className={styles.footerItem} onClick={handleLogout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
